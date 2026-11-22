import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db, prepare, log } from '../../../../../lib/db.js';
import { COOKIE_NAME, cookieSettings, digest, token } from '../../../../../lib/security.js';
import {
  MICROSOFT_OAUTH_COOKIE, MicrosoftAuthError, microsoftConfig, microsoftCookieOptions,
  readMicrosoftTransaction, exchangeMicrosoftCode, verifyMicrosoftIdToken, microsoftUsername
} from '../../../../../lib/microsoft-auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function finish(request, status, session = null) {
  // Redirect only to our fixed registered origin, never to a provider-supplied destination.
  let base;
  try { base = microsoftConfig().origin; } catch { base = new URL(request.url).origin; }
  const response = NextResponse.redirect(new URL('/?microsoft=' + status, base));
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(MICROSOFT_OAUTH_COOKIE, '', microsoftCookieOptions(0));
  if (session) response.cookies.set(COOKIE_NAME, session, cookieSettings);
  return response;
}
async function existingLocalAccount(request) {
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const result = await db().query(
    "SELECT u.id,u.username,u.display_name,u.role,u.operational_role,u.must_change_password " +
    "FROM sessions s JOIN users u ON u.id=s.user_id " +
    "WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL " +
    "AND u.active=true AND u.must_change_password=false", [digest(raw)]);
  return result.rows[0] || null;
}
async function createSession(user) {
  const value = token();
  await db().query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",
    [digest(value), user.id]);
  await log(user.id, 'login_microsoft', user.username);
  return value;
}
export async function GET(request) {
  try {
    const cfg = microsoftConfig();
    if (new URL(request.url).origin !== cfg.origin) throw new MicrosoftAuthError('config');
    const params = new URL(request.url).searchParams;
    const transaction = readMicrosoftTransaction(
      request.cookies.get(MICROSOFT_OAUTH_COOKIE)?.value, cfg.secret, params.get('state'));
    if (params.has('error')) return finish(request, 'consent');
    const jwt = await exchangeMicrosoftCode(cfg, params.get('code'), transaction.verifier);
    const identity = await verifyMicrosoftIdToken(jwt, cfg, transaction.nonce);
    await prepare();

    const existing = await db().query(
      "SELECT u.id,u.username,u.display_name,u.role,u.operational_role,u.must_change_password,u.active " +
      "FROM microsoft_identities m JOIN users u ON u.id=m.user_id " +
      "WHERE m.tenant_id=$1 AND m.object_id=$2", [identity.tenantId, identity.objectId]);
    const linked = existing.rows[0] || null;
    if (transaction.linkUserId) {
      const localUser = await existingLocalAccount(request);
      if (!localUser || localUser.id !== transaction.linkUserId) throw new MicrosoftAuthError('link');
      if (linked && linked.id !== localUser.id) throw new MicrosoftAuthError('linked');
      try {
        await db().query(
          "INSERT INTO microsoft_identities(tenant_id,object_id,user_id,email) " +
          "VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,object_id) DO UPDATE SET email=EXCLUDED.email " +
          "WHERE microsoft_identities.user_id=EXCLUDED.user_id",
          [identity.tenantId, identity.objectId, localUser.id, identity.email]);
      } catch (error) {
        if (error.code === '23505') throw new MicrosoftAuthError('linked');
        throw error;
      }
      await log(localUser.id, 'microsoft_account_linked', identity.tenantId + '/' + identity.objectId);
      return finish(request, 'linked');
    }
    if (linked && !linked.active) throw new MicrosoftAuthError('disabled');
    if (linked) return finish(request, 'success', await createSession(linked));

    // Unlinked users are never matched to existing accounts by e-mail.
    // Their Microsoft oid+tid generates an opaque pending-request username.
    const username = microsoftUsername(identity.tenantId, identity.objectId);
    const userResult = await db().query(
      "SELECT id,username,display_name,role,operational_role,must_change_password,active " +
      "FROM users WHERE username=$1", [username]);
    let user = userResult.rows[0];
    if (user && !user.active) throw new MicrosoftAuthError('disabled');
    if (!user) {
      await db().query(
        "INSERT INTO access_requests(id,username,display_name,reason) " +
        "VALUES($1,$2,$3,$4) ON CONFLICT(username) DO NOTHING",
        [randomUUID(), username, identity.name || 'Usuário Microsoft',
          'Conta Microsoft corporativa validada: ' + identity.email]);
      return finish(request, 'pending');
    }
    // Account previously approved by the existing access manager.
    if (user.must_change_password) {
      await db().query('UPDATE users SET must_change_password=false WHERE id=$1', [user.id]);
      user = { ...user, must_change_password: false };
    }
    try {
      await db().query(
        "INSERT INTO microsoft_identities(tenant_id,object_id,user_id,email) VALUES($1,$2,$3,$4)",
        [identity.tenantId, identity.objectId, user.id, identity.email]);
    } catch (error) {
      if (error.code === '23505') throw new MicrosoftAuthError('linked');
      throw error;
    }
    return finish(request, 'success', await createSession(user));
  } catch (error) {
    console.error('Microsoft callback:', error instanceof MicrosoftAuthError ? error.code : 'unexpected');
    return finish(request, error instanceof MicrosoftAuthError ? error.code : 'failed');
  }
}
