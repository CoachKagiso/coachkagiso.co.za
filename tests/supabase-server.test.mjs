import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupabaseReadRetryFetch } from '../lib/supabase-read-retry.ts';

test('retries a failed safe Supabase read before returning its response', async () => {
  let calls = 0;
  const fetchWithRetry = createSupabaseReadRetryFetch(async () => {
    calls += 1;
    if (calls === 1) throw new TypeError('fetch failed');
    return new Response('[]', { status: 200 });
  }, { retryDelayMs: 0 });

  const response = await fetchWithRetry('https://example.supabase.co/rest/v1/payments');

  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test('does not retry a Supabase mutation because its outcome may be ambiguous', async () => {
  let calls = 0;
  const fetchWithRetry = createSupabaseReadRetryFetch(async () => {
    calls += 1;
    throw new TypeError('fetch failed');
  }, { retryDelayMs: 0 });

  await assert.rejects(
    () => fetchWithRetry('https://example.supabase.co/rest/v1/payments', { method: 'POST' }),
    /fetch failed/,
  );

  assert.equal(calls, 1);
});

test('stops retrying an unavailable read after the configured retry budget', async () => {
  let calls = 0;
  const fetchWithRetry = createSupabaseReadRetryFetch(async () => {
    calls += 1;
    return new Response('Unavailable', { status: 503 });
  }, { maxRetries: 1, retryDelayMs: 0 });

  const response = await fetchWithRetry('https://example.supabase.co/rest/v1/payments');

  assert.equal(response.status, 503);
  assert.equal(calls, 2);
});
