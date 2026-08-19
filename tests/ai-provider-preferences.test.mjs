import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProviderPreferences } from '../lib/ai-provider-preferences.ts';

test('OpenRouter calls deny data collection by default', () => {
  assert.deepEqual(buildProviderPreferences('openrouter', {}, undefined), {
    data_collection: 'deny',
  });
});

test('zero retention is opt-in and omitted rather than set false', () => {
  assert.deepEqual(buildProviderPreferences('openrouter', { zeroRetention: true }, undefined), {
    data_collection: 'deny',
    zdr: true,
  });
  const relaxed = buildProviderPreferences('openrouter', { zeroRetention: false }, undefined);
  assert.equal('zdr' in relaxed, false, 'a non-PII route must send no zdr key at all');
});

test('a route keeps the privacy floor when it sets unrelated routing preferences', () => {
  assert.deepEqual(buildProviderPreferences('openrouter', {}, { order: ['cerebras'] }), {
    data_collection: 'deny',
    order: ['cerebras'],
  });
});

test('a deliberate route override wins over the default', () => {
  assert.deepEqual(buildProviderPreferences('openrouter', {}, { data_collection: 'allow' }), {
    data_collection: 'allow',
  });
  assert.deepEqual(
    buildProviderPreferences('openrouter', { zeroRetention: true }, { zdr: false }),
    { data_collection: 'deny', zdr: false },
  );
});

test('non-object provider payloads are ignored', () => {
  for (const value of [null, 'deny', 42, ['deny']]) {
    assert.deepEqual(buildProviderPreferences('openrouter', {}, value), {
      data_collection: 'deny',
    });
  }
});

test('zai passes the payload provider through untouched', () => {
  assert.equal(buildProviderPreferences('zai', { zeroRetention: true }, undefined), null);
  assert.deepEqual(buildProviderPreferences('zai', {}, { order: ['x'] }), { order: ['x'] });
});
