import { NextResponse } from 'next/server';
import { db, prepare } from '../../../../../lib/db.js';
import { COOKIE_NAME, digest } from '../../../../../lib/security.js';
import {
  MICROSOFT_OAUTH_COOKIE, MicrosoftAuthError, microsoftConfig, microsoftCookieOptions,
  createMicrosoftTransaction, sealMicrosoftTransaction, authorizationUrl
} from '../../../../../lib/microsoft-auth.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cfg = microsoftConfig();
    if (new URL(request.url).origin !== cfg.origin) throw new MicrosoftAuthError('config');
    const link = new URL(request.url).searchParams.get('link') === '1';
    let linkUserId = null;
    if (link) {
      const raw = request.cookies.get(COOKIE_NAME)?.value;
      if (!raw) throw new MicrosoftAuthError('link');
      await prepare();
      const result = await db().query(
        "SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id " +
        "WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL " +
        "AND u.active=true AND u.must_change_password=false",
        [digest(raw)]
      );
      linkUserId = result.rows[0]?.id;
      if (!linkUserId) throw new MicrosoftAuthError('link');
    }
    const transaction = createMicrosoftTransaction(linkUserId);
    const response = NextResponse.redirect(authorizationUrl(cfg, transaction));
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(MICROSOFT_OAUTH_COOKIE,
      sealMicrosoftTransaction(transaction, cfg.secret), microsoftCookieOptions());
    return response;
  } catch (error) {
    console.error('Microsoft sign-in start:', error instanceof MicrosoftAuthError ? error.code : 'unexpected');
    const response = NextResponse.redirect(new URL('/?microsoft=' +
      (error instanceof MicrosoftAuthError ? error.code : 'failed'), request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
