import assert from 'node:assert/strict';
import test from 'node:test';

import { isDeniedHost, isFetchableHttpUrl } from '../lib/safe-fetch.ts';

test('denies cloud metadata and every loopback address', () => {
  for (const host of ['169.254.169.254', '169.254.0.1', '127.0.0.1', '127.0.0.5', '127.1.2.3', 'metadata', 'metadata.google.internal']) {
    assert.equal(isDeniedHost(host), true, `${host} must be denied`);
  }
});

test('denies private, CGNAT, reserved, and multicast ranges', () => {
  const denied = [
    '0.0.0.0', '0.1.2.3',
    '10.1.2.3',
    '100.64.0.1', '100.127.255.255',
    '172.16.0.1', '172.31.255.255',
    '192.168.1.1',
    '192.0.0.1', '192.0.2.5', '192.88.99.1',
    '198.18.0.1', '198.19.255.1', '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1', '255.255.255.255',
  ];
  for (const host of denied) {
    assert.equal(isDeniedHost(host), true, `${host} must be denied`);
  }
});

test('denies internal-looking names and every IPv6 literal', () => {
  for (const host of ['localhost', 'app.localhost', 'printer.local', 'foo.internal', 'router.home.arpa', 'LOCALHOST', 'localhost.']) {
    assert.equal(isDeniedHost(host), true, `${host} must be denied`);
  }
  for (const host of ['::1', '[::1]', '::', '[::ffff:169.254.169.254]', 'fe80::1', 'fc00::1', '[64:ff9b::a9fe:a9fe]']) {
    assert.equal(isDeniedHost(host), true, `${host} must be denied`);
  }
});

test('allows ordinary public hosts', () => {
  for (const host of ['8.8.8.8', '1.1.1.1', 'coachkagiso.co.za', 'www.linkedin.com', '172.32.0.1', '100.63.255.255', '11.0.0.1']) {
    assert.equal(isDeniedHost(host), false, `${host} must be allowed`);
  }
});

test('an empty host is denied rather than allowed by default', () => {
  assert.equal(isDeniedHost(''), true);
  assert.equal(isDeniedHost('   '), true);
});

test('the URL parser normalizes alternate IPv4 encodings before the check runs', () => {
  // This is why isDeniedHost only needs to understand dotted-quad notation.
  assert.equal(new URL('http://2130706433/').hostname, '127.0.0.1');
  assert.equal(new URL('http://0x7f000001/').hostname, '127.0.0.1');
  assert.equal(new URL('http://0177.0.0.1/').hostname, '127.0.0.1');
  assert.equal(new URL('http://2852039166/').hostname, '169.254.169.254');

  for (const url of ['http://2130706433/', 'http://0x7f000001/', 'http://0177.0.0.1/', 'http://2852039166/']) {
    assert.equal(isFetchableHttpUrl(url), false, `${url} must not be fetchable`);
  }
});

test('rejects non-http schemes, credentials, and malformed URLs', () => {
  assert.equal(isFetchableHttpUrl('file:///etc/passwd'), false);
  assert.equal(isFetchableHttpUrl('ftp://example.com/x'), false);
  assert.equal(isFetchableHttpUrl('gopher://example.com'), false);
  assert.equal(isFetchableHttpUrl('http://user:pass@example.com/'), false);
  assert.equal(isFetchableHttpUrl('not a url'), false);
});

test('accepts a normal public page', () => {
  assert.equal(isFetchableHttpUrl('https://coachkagiso.co.za/insights'), true);
  assert.equal(isFetchableHttpUrl(new URL('http://example.com/a?b=c')), true);
});
