import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboardAuthUrl,
  DASHBOARD_SESSION_CLIENT_MARKER,
  getDashboardLegacyKey,
} from '../lib/dashboard-auth-url.ts';
import {
  DASHBOARD_SESSION_COOKIE_NAME,
  createDashboardSessionToken,
  getDashboardSessionCookieOptions,
  isDashboardRequestAuthorized,
  parseDashboardLoginKey,
  recordDashboardLoginFailure,
  readDashboardLoginLimit,
  verifyDashboardSessionToken,
} from '../lib/dashboard-session.ts';

const secret = 'a-long-dashboard-secret-used-only-for-tests';
const now = Date.parse('2026-07-19T12:00:00.000Z');

test('creates a signed dashboard session that expires after eight hours', () => {
  const token = createDashboardSessionToken(secret, { now, nonce: 'fixed-test-nonce' });

  assert.equal(verifyDashboardSessionToken(token, secret, now + 7 * 60 * 60 * 1000), true);
  assert.equal(verifyDashboardSessionToken(token, secret, now + 8 * 60 * 60 * 1000 + 1), false);
  assert.equal(verifyDashboardSessionToken(token, 'wrong-secret', now), false);
  assert.equal(verifyDashboardSessionToken(`${token}tampered`, secret, now), false);
});

test('authorizes the signed cookie but never treats the client marker as a credential', () => {
  const token = createDashboardSessionToken(secret, { now, nonce: 'request-test-nonce' });
  const cookieHeader = `${DASHBOARD_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;

  assert.equal(isDashboardRequestAuthorized({ cookieHeader, providedKey: '', secret, now }), true);
  assert.equal(isDashboardRequestAuthorized({ cookieHeader: '', providedKey: secret, secret, now }), true);
  assert.equal(
    isDashboardRequestAuthorized({
      cookieHeader: '',
      providedKey: DASHBOARD_SESSION_CLIENT_MARKER,
      secret,
      now,
    }),
    false,
  );
});

test('keeps the session marker out of URLs while preserving the temporary legacy key fallback', () => {
  assert.equal(getDashboardLegacyKey(DASHBOARD_SESSION_CLIENT_MARKER), '');
  assert.equal(getDashboardLegacyKey(''), '');
  assert.equal(getDashboardLegacyKey('  legacy-admin-key  '), 'legacy-admin-key');
  assert.equal(
    buildDashboardAuthUrl('/api/example', DASHBOARD_SESSION_CLIENT_MARKER, { leadId: 'lead/123' }),
    '/api/example?leadId=lead%2F123',
  );
  assert.equal(
    buildDashboardAuthUrl('/api/example', 'legacy-admin-key', { leadId: 'lead/123' }),
    '/api/example?key=legacy-admin-key&leadId=lead%2F123',
  );
});

test('uses hardened production cookie options', () => {
  assert.deepEqual(getDashboardSessionCookieOptions(true), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
    priority: 'high',
  });
  assert.equal(getDashboardSessionCookieOptions(false).secure, false);
});

test('blocks dashboard login after five failures in fifteen minutes', () => {
  let state = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    state = recordDashboardLoginFailure(state, now + attempt * 1000);
  }

  assert.deepEqual(readDashboardLoginLimit(state, now + 5000), {
    allowed: false,
    retryAfterSeconds: 15 * 60 - 1,
  });
  assert.deepEqual(readDashboardLoginLimit(state, now + 15 * 60 * 1000 + 5000), {
    allowed: true,
    retryAfterSeconds: 0,
  });
});

test('parses only a bounded URL-encoded dashboard login key', () => {
  assert.equal(parseDashboardLoginKey('username=dashboard-admin&key=valid%2Fkey'), 'valid/key');
  assert.equal(parseDashboardLoginKey(`key=${'x'.repeat(513)}`), null);
  assert.equal(parseDashboardLoginKey(`key=${'x'.repeat(4097)}`), null);
});
