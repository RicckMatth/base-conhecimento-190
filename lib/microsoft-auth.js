// Microsoft Entra ID OIDC: server-only authorization code + PKCE, validated to the allowed corporate tenant.
import {
  createHash, randomBytes, createCipheriv, createDecipheriv,
  createPublicKey, timingSafeEqual, verify
} from 'node:crypto';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER = 'https://login.microsoftonline.com';
const MAX_AGE_MS = 10 * 60 * 1000;
export const MICROSOFT_OAUTH_COOKIE = '__Host-base190_ms_oauth';

export class MicrosoftAuthError extends Error {
  constructor(code = 'failed') { super(code); this.code = code; }
}
export function microsoftConfig(env = process.env) {
  const clientId = String(env.MICROSOFT_CLIENT_ID || '').trim();
  const secret = String(env.MICROSOFT_CLIENT_SECRET || '');
  const allowedTenantId = String(env.MICROSOFT_ALLOWED_TENANT_ID || '').trim().toLowerCase();
  const uri = String(env.MICROSOFT_REDIRECT_URI || '').trim();
  if (!GUID.test(clientId) || !GUID.test(allowedTenantId) || !secret || !uri) {
    throw new MicrosoftAuthError('config');
  }
  let redirect;
  try { redirect = new URL(uri); } catch { throw new MicrosoftAuthError('config'); }
  if (redirect.protocol !== 'https:' || redirect.username || redirect.password ||
      redirect.pathname !== '/api/auth/microsoft/callback' || redirect.search || redirect.hash) {
    throw new MicrosoftAuthError('config');
  }
  return {
    clientId, secret, allowedTenantId, redirectUri: redirect.toString(),
    origin: redirect.origin, authority: PROVIDER + '/' + allowedTenantId
  };
}
export function microsoftCookieOptions(maxAge = 600) {
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge };
}
function random() { return randomBytes(32).toString('base64url'); }
function hash(value) { return createHash('sha256').update(value).digest(); }
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function createMicrosoftTransaction(linkUserId = null) {
  return { state: random(), nonce: random(), verifier: random(), startedAt: Date.now(), linkUserId };
}
function cookieKey(secret) { return hash('base190:entra:oauth-cookie:v1:' + secret); }
export function sealMicrosoftTransaction(transaction, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cookieKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(transaction)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function readMicrosoftTransaction(cookie, secret, state, now = Date.now()) {
  try {
    if (!cookie || cookie.length > 3072) throw Error('invalid cookie');
    const bytes = Buffer.from(cookie, 'base64url');
    if (bytes.length < 45) throw Error('invalid cookie');
    const decipher = createDecipheriv('aes-256-gcm', cookieKey(secret), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const transaction = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    if (!safeEqual(state, transaction.state) ||
        !/^[A-Za-z0-9_-]{43}$/.test(transaction.state || '') ||
        !/^[A-Za-z0-9_-]{43}$/.test(transaction.nonce || '') ||
        !/^[A-Za-z0-9_-]{43}$/.test(transaction.verifier || '') ||
        !Number.isFinite(transaction.startedAt) || transaction.startedAt > now + 30_000 ||
        now - transaction.startedAt > MAX_AGE_MS) throw Error('invalid oauth transaction');
    if (transaction.linkUserId !== null && transaction.linkUserId !== undefined &&
        !GUID.test(transaction.linkUserId)) throw Error('invalid link user');
    return transaction;
  } catch { throw new MicrosoftAuthError('expired'); }
}
export function authorizationUrl(cfg, transaction) {
  const url = new URL(cfg.authority + '/oauth2/v2.0/authorize');
  const challenge = hash(transaction.verifier).toString('base64url');
  url.search = new URLSearchParams({
    client_id: cfg.clientId, response_type: 'code', redirect_uri: cfg.redirectUri,
    scope: 'openid profile email', response_mode: 'query', state: transaction.state,
    nonce: transaction.nonce, code_challenge: challenge, code_challenge_method: 'S256',
    prompt: 'select_account'
  }).toString();
  return url;
}
export function microsoftUsername(tid, oid) {
  if (!GUID.test(tid) || !GUID.test(oid)) throw new MicrosoftAuthError('invalid');
  return 'ms-' + hash(tid.toLowerCase() + ':' + oid.toLowerCase()).toString('hex').slice(0, 32);
}
export async function exchangeMicrosoftCode(cfg, code, verifier, fetchFn = fetch) {
  if (typeof code !== 'string' || !code || code.length > 4096) throw new MicrosoftAuthError('invalid');
  const body = new URLSearchParams({
    client_id: cfg.clientId, client_secret: cfg.secret, grant_type: 'authorization_code',
    code, redirect_uri: cfg.redirectUri, code_verifier: verifier, scope: 'openid profile email'
  });
  let response;
  try {
    response = await fetchFn(cfg.authority + '/oauth2/v2.0/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body, signal: AbortSignal.timeout(12000), cache: 'no-store'
    });
  } catch { throw new MicrosoftAuthError('provider'); }
  if (!response.ok) throw new MicrosoftAuthError(response.status === 400 ? 'consent' : 'provider');
  const tokens = await response.json();
  if (typeof tokens.id_token !== 'string') throw new MicrosoftAuthError('invalid');
  return tokens.id_token;
}
function decodeJwtPart(value) {
  if (typeof value !== 'string' || value.length > 18000 || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new MicrosoftAuthError('invalid');
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); }
  catch { throw new MicrosoftAuthError('invalid'); }
}
export async function verifyMicrosoftIdToken(jwt, cfg, expectedNonce, fetchFn = fetch, nowMs = Date.now()) {
  if (typeof jwt !== 'string' || jwt.length > 25000) throw new MicrosoftAuthError('invalid');
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new MicrosoftAuthError('invalid');
  const header = decodeJwtPart(parts[0]), claims = decodeJwtPart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 256)
    throw new MicrosoftAuthError('invalid');
  const expectedIssuer = cfg.authority + '/v2.0';
  const now = Math.floor(nowMs / 1000);
  if (claims.ver !== '2.0' || claims.tid?.toLowerCase() !== cfg.allowedTenantId ||
      claims.iss !== expectedIssuer || claims.aud !== cfg.clientId ||
      !GUID.test(claims.oid || '') || !safeEqual(claims.nonce, expectedNonce) ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= now - 60 ||
      (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > now + 60)) ||
      (claims.iat !== undefined && (!Number.isSafeInteger(claims.iat) || claims.iat > now + 60))) {
    throw new MicrosoftAuthError('invalid');
  }
  // preferred_username is only an additional domain rule. The tenant + oid are the actual identity.
  const email = String(claims.preferred_username || claims.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@minsait\.com$/.test(email)) throw new MicrosoftAuthError('domain');
  let response;
  try {
    response = await fetchFn(cfg.authority + '/discovery/v2.0/keys', {
      headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(12000)
    });
  } catch { throw new MicrosoftAuthError('provider'); }
  if (!response.ok) throw new MicrosoftAuthError('provider');
  const jwks = await response.json();
  const jwk = Array.isArray(jwks.keys) && jwks.keys.find(key =>
    key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig') &&
    (!key.issuer || key.issuer === expectedIssuer || key.issuer === PROVIDER + '/{tenantid}/v2.0'));
  if (!jwk) throw new MicrosoftAuthError('invalid');
  let valid = false;
  try {
    valid = verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]),
      createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
  } catch { throw new MicrosoftAuthError('invalid'); }
  if (!valid) throw new MicrosoftAuthError('invalid');
  return {
    tenantId: claims.tid.toLowerCase(),
    objectId: claims.oid.toLowerCase(),
    email, name: String(claims.name || email.split('@')[0]).trim().slice(0, 100)
  };
}
