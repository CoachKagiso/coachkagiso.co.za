import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createZohoOAuthState,
  readCookieValue,
  resolveZohoAccountsBaseUrl,
  zohoOAuthStateMatches,
} from '../lib/zoho-oauth.ts';

test('uses a genuine Zoho accounts server named by the request', () => {
  assert.equal(resolveZohoAccountsBaseUrl('https://accounts.zoho.eu'), 'https://accounts.zoho.eu');
  assert.equal(resolveZohoAccountsBaseUrl('https://accounts.zoho.com.au/'), 'https://accounts.zoho.com.au');
  assert.equal(resolveZohoAccountsBaseUrl('https://accounts.zoho.in', 'https://accounts.zoho.com'), 'https://accounts.zoho.in');
});

test('never sends the secret to a host the request chose', () => {
  const hostile = [
    'https://attacker.example',
    'https://accounts.zoho.com.attacker.example',
    'https://attacker.example/accounts.zoho.com',
    'https://accounts.zoho.com@attacker.example',
    'https://accounts.zoho.com:8443',
    'http://accounts.zoho.com',
    'https://evilaccounts.zoho.com',
    'https://accounts.zoho.xyz',
    'http://169.254.169.254',
    'accounts.zoho.com',
    '//attacker.example',
    '',
  ];

  for (const requested of hostile) {
    assert.equal(resolveZohoAccountsBaseUrl(requested), 'https://accounts.zoho.com', requested);
    assert.equal(
      resolveZohoAccountsBaseUrl(requested, 'https://accounts.zoho.eu/'),
      'https://accounts.zoho.eu',
      requested,
    );
  }
});

test('falls back to the default accounts server', () => {
  assert.equal(resolveZohoAccountsBaseUrl(null), 'https://accounts.zoho.com');
  assert.equal(resolveZohoAccountsBaseUrl(undefined, '   '), 'https://accounts.zoho.com');
});

test('state values are random and compared exactly', () => {
  const state = createZohoOAuthState();

  assert.ok(state.length >= 32);
  assert.notEqual(state, createZohoOAuthState());
  assert.equal(zohoOAuthStateMatches(state, state), true);
  assert.equal(zohoOAuthStateMatches(state, `${state}x`), false);
  assert.equal(zohoOAuthStateMatches(state, null), false);
  assert.equal(zohoOAuthStateMatches(null, null), false);
  assert.equal(zohoOAuthStateMatches('', ''), false);
});

test('reads one named cookie from a header', () => {
  const header = 'a=1; zoho_oauth_state=abc%2Fdef; b=2';

  assert.equal(readCookieValue(header, 'zoho_oauth_state'), 'abc/def');
  assert.equal(readCookieValue(header, 'missing'), null);
  assert.equal(readCookieValue(null, 'a'), null);
});
