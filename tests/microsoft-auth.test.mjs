import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  MicrosoftAuthError, microsoftConfig, createMicrosoftTransaction, authorizationUrl,
  sealMicrosoftTransaction, readMicrosoftTransaction, microsoftUsername,
  verifyMicrosoftIdToken
} from '../lib/microsoft-auth.js';

const tenant = '7808e005-1489-4374-95a1-111111111111';
const client = 'a5178971-4b99-456e-b9c0-0691e22fe516';
const oid = '8310be96-511e-4900-aa8b-eecfc5491171';
const cfg = microsoftConfig({
  MICROSOFT_CLIENT_ID: client, MICROSOFT_CLIENT_SECRET: 'test-secret-only',
  MICROSOFT_TENANT_ID: '5ea1b932-726b-4415-8113-a1a12bea0d68',
  MICROSOFT_ALLOWED_TENANT_ID: tenant,
  MICROSOFT_REDIRECT_URI: 'https://base-conhecimento-190.vercel.app/api/auth/microsoft/callback'
});
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig' };
const fakeFetch = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
function makeToken(overrides = {}) {
  const head = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ver: '2.0', tid: tenant, oid, iss: cfg.authority + '/v2.0',
    aud: client, nonce: 'nonce-for-test', preferred_username: 'usuario@minsait.com',
    name: 'Usuário Exemplo', iat: now, exp: now + 600, ...overrides
  };
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const content = head + '.' + body;
  return content + '.' + sign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url');
}
test('app is multitenant but sign-in is always directed to Indra allowlisted tenant', () => {
  const url = authorizationUrl(cfg, createMicrosoftTransaction());
  assert.equal(url.origin, 'https://login.microsoftonline.com');
  assert.equal(url.pathname, '/' + tenant + '/oauth2/v2.0/authorize');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.ok(url.searchParams.get('nonce'));
  assert.equal(url.searchParams.get('redirect_uri'), cfg.redirectUri);
});
test('encrypted one-time OAuth cookie validates state, freshness and secret', () => {
  const state = createMicrosoftTransaction();
  const sealed = sealMicrosoftTransaction(state, cfg.secret);
  assert.deepEqual(readMicrosoftTransaction(sealed, cfg.secret, state.state), state);
  assert.throws(() => readMicrosoftTransaction(sealed, cfg.secret, 'wrong'), MicrosoftAuthError);
  assert.throws(() => readMicrosoftTransaction(sealed, 'wrong-secret', state.state), MicrosoftAuthError);
  assert.throws(() => readMicrosoftTransaction(sealed, cfg.secret, state.state, state.startedAt + 610000), MicrosoftAuthError);
});
test('Microsoft oid+tenant is stable and independent of changeable email', () => {
  assert.equal(microsoftUsername(tenant, oid), microsoftUsername(tenant, oid));
  assert.notEqual(microsoftUsername(tenant, oid), microsoftUsername(tenant, '8310be96-511e-4900-aa8b-eecfc5491172'));
  assert.match(microsoftUsername(tenant, oid), /^ms-[a-f0-9]{32}$/);
});
test('verified corporate token is accepted', async () => {
  const identity = await verifyMicrosoftIdToken(makeToken(), cfg, 'nonce-for-test', fakeFetch);
  assert.equal(identity.email, 'usuario@minsait.com');
  assert.equal(identity.tenantId, tenant);
  assert.equal(identity.objectId, oid);
});
test('domain check does not accept other companies', async () => {
  await assert.rejects(
    verifyMicrosoftIdToken(makeToken({ preferred_username: 'pessoa@outraempresa.com' }), cfg, 'nonce-for-test', fakeFetch),
    error => error.code === 'domain');
});
test('same email from a different tenant is rejected', async () => {
  await assert.rejects(
    verifyMicrosoftIdToken(makeToken({ tid: '5311fe11-1111-4111-8111-111111111111' }), cfg, 'nonce-for-test', fakeFetch),
    error => error.code === 'invalid');
});
test('tampered, expired or mismatched OIDC tokens are rejected', async () => {
  await assert.rejects(verifyMicrosoftIdToken(makeToken(), cfg, 'wrong-nonce', fakeFetch), error => error.code === 'invalid');
  await assert.rejects(verifyMicrosoftIdToken(makeToken({ exp: 1 }), cfg, 'nonce-for-test', fakeFetch), error => error.code === 'invalid');
  await assert.rejects(verifyMicrosoftIdToken(makeToken({ aud: '00000000-0000-4000-8000-000000000000' }), cfg, 'nonce-for-test', fakeFetch), error => error.code === 'invalid');
  const token = makeToken();
  await assert.rejects(verifyMicrosoftIdToken(token.slice(0, -1) + (token.at(-1) === 'A' ? 'B' : 'A'), cfg, 'nonce-for-test', fakeFetch), error => error.code === 'invalid');
});
test('invalid configuration fails closed', () => {
  assert.throws(() => microsoftConfig({ MICROSOFT_CLIENT_ID: client }), error => error.code === 'config');
  assert.throws(() => microsoftConfig({
    MICROSOFT_CLIENT_ID: client, MICROSOFT_CLIENT_SECRET: 'secret', MICROSOFT_ALLOWED_TENANT_ID: tenant,
    MICROSOFT_REDIRECT_URI: 'http://localhost:3000/api/auth/microsoft/callback'
  }), error => error.code === 'config');
});
