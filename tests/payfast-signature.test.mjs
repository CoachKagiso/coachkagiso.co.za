import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { registerHooks } from 'node:module';
import test from 'node:test';

import { orderPayFastCheckoutFields } from '../lib/payfast-signature.ts';

// Stubs for everything the notify route touches outside the signature check, so
// the tests can drive the real POST handler without a database or email provider.
const routeStubs = {
  'next/server': 'export class NextResponse extends Response { static json(body, init) { return Response.json(body, init); } }',
  '@/lib/dashboard-notifications': 'export const recordDashboardNotification = async () => {};',
  '@/lib/delivery-milestones': 'export const ensureClientDeliveryMilestones = async () => {};',
  '@/lib/notifications': 'export const notifyKagisoPayment = async () => {};',
  '@/lib/supabase-server': 'export const createSupabaseServiceClient = () => globalThis.payfastTestSupabase;',
  '@/lib/upgrade-credits': 'export const getUpgradeOfferByToken = async () => null; export const markUpgradeCreditUsed = async () => {};',
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (routeStubs[specifier]) {
      return { url: `data:text/javascript,${encodeURIComponent(routeStubs[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { asyncServices } = await import('../lib/buying-flow.ts');
const {
  createPayFastCheckoutFields,
  validatePayFastSignature,
  validatePayFastSignatureFromRawBody,
} = await import('../lib/payfast.ts');
const { POST } = await import('../app/api/payfast/notify/route.ts');

test('orders accepted-booking checkout fields according to PayFast custom integration requirements', () => {
  const unorderedFields = {
    merchant_id: '10000100',
    merchant_key: 'merchant-key',
    return_url: 'https://example.com/thanks',
    cancel_url: 'https://example.com/cancel',
    notify_url: 'https://example.com/notify',
    m_payment_id: 'career-clarity-abc',
    amount: '800.00',
    item_name: 'Career Clarity Session',
    custom_str1: 'career-clarity',
    email_address: 'client@example.com',
    name_first: 'Lerato',
    name_last: 'Mokoena',
    custom_str4: 'cal-booking-123',
  };

  assert.deepEqual(Object.keys(orderPayFastCheckoutFields(unorderedFields)), [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'm_payment_id',
    'amount',
    'item_name',
    'custom_str1',
    'custom_str4',
  ]);
});

const PASSPHRASE = 'test passphrase';
const md5 = (value) => crypto.createHash('md5').update(value).digest('hex');

// PayFast posts blank fields too and signs the body in the order it was sent.
const itnBody = [
  'm_payment_id=cv-revamp-abc',
  'pf_payment_id=1234567',
  'payment_status=COMPLETE',
  'item_name=CV+Revamp',
  'item_description=',
  'amount_gross=400.00',
  'amount_fee=-9.20',
  'amount_net=390.80',
  'custom_str1=cv-revamp',
  'custom_str2=',
  'name_first=Lerato',
  'name_last=Mokoena',
  'email_address=lerato%40example.com',
  'merchant_id=10000100',
].join('&');
const keyedSignature = (body) => md5(`${body}&passphrase=test+passphrase`);
const fieldsOf = (body) => Object.fromEntries(new URLSearchParams(body).entries());

function withPassphrase(t, value) {
  const original = process.env.PAYFAST_PASSPHRASE;
  if (value === undefined) delete process.env.PAYFAST_PASSPHRASE;
  else process.env.PAYFAST_PASSPHRASE = value;
  t.after(() => {
    if (original === undefined) delete process.env.PAYFAST_PASSPHRASE;
    else process.env.PAYFAST_PASSPHRASE = original;
  });
  // The validators and route log every rejection; keep the test output readable.
  for (const method of ['info', 'warn', 'error']) t.mock.method(console, method, () => {});
}

function fakeSupabase(t) {
  const writes = { payments: [], payment_webhook_events: [] };
  const record = (table) => async (row) => {
    writes[table].push(row);
    return { error: null };
  };
  globalThis.payfastTestSupabase = {
    from: (table) => ({ insert: record(table), upsert: record(table) }),
  };
  t.after(() => {
    delete globalThis.payfastTestSupabase;
  });
  return writes;
}

const postItn = (body) => POST(new Request('https://example.com/api/payfast/notify', { method: 'POST', body }));

test('accepts a genuine ITN signed with the passphrase', (t) => {
  withPassphrase(t, PASSPHRASE);
  const signature = keyedSignature(itnBody);

  assert.equal(validatePayFastSignatureFromRawBody(`${itnBody}&signature=${signature}`, signature), true);
  assert.equal(validatePayFastSignatureFromRawBody(itnBody, signature.toUpperCase()), true);
});

test('accepts signatures over the re-encoded fields when they include the passphrase', (t) => {
  withPassphrase(t, PASSPHRASE);
  const fields = { payment_status: 'COMPLETE', m_payment_id: 'cv-revamp-abc', custom_str2: '' };
  const unsorted = md5('payment_status=COMPLETE&m_payment_id=cv-revamp-abc&passphrase=test+passphrase');
  const sorted = md5('m_payment_id=cv-revamp-abc&payment_status=COMPLETE&passphrase=test+passphrase');

  assert.equal(validatePayFastSignature({ ...fields, signature: unsorted }), true);
  assert.equal(validatePayFastSignature({ ...fields, signature: sorted }), true);
});

test('rejects an unkeyed MD5 of the notification', (t) => {
  withPassphrase(t, PASSPHRASE);
  const forged = md5(itnBody);

  assert.equal(validatePayFastSignatureFromRawBody(itnBody, forged), false);
  assert.equal(
    validatePayFastSignature({
      payment_status: 'COMPLETE',
      m_payment_id: 'cv-revamp-abc',
      signature: md5('payment_status=COMPLETE&m_payment_id=cv-revamp-abc'),
    }),
    false,
  );
  assert.equal(
    validatePayFastSignature({
      payment_status: 'COMPLETE',
      m_payment_id: 'cv-revamp-abc',
      signature: md5('m_payment_id=cv-revamp-abc&payment_status=COMPLETE'),
    }),
    false,
  );
});

for (const [label, value] of [['unset', undefined], ['empty', ''], ['only whitespace', '   ']]) {
  test(`fails closed when PAYFAST_PASSPHRASE is ${label}`, (t) => {
    withPassphrase(t, value);
    const fields = { payment_status: 'COMPLETE', m_payment_id: 'cv-revamp-abc' };

    assert.equal(validatePayFastSignatureFromRawBody(itnBody, md5(itnBody)), false);
    assert.equal(
      validatePayFastSignature({ ...fields, signature: md5('payment_status=COMPLETE&m_payment_id=cv-revamp-abc') }),
      false,
    );
  });
}

test('rejects a signature of the wrong length without throwing', (t) => {
  withPassphrase(t, PASSPHRASE);

  assert.equal(validatePayFastSignatureFromRawBody(itnBody, 'abc'), false);
  assert.equal(validatePayFastSignature({ ...fieldsOf(itnBody), signature: 'é'.repeat(32) }), false);
});

test('notify route records a genuine ITN as a confirmed payment', async (t) => {
  withPassphrase(t, PASSPHRASE);
  const writes = fakeSupabase(t);

  const response = await postItn(`${itnBody}&signature=${keyedSignature(itnBody)}`);

  assert.equal(response.status, 200);
  assert.equal(writes.payments.length, 1);
  assert.equal(writes.payments[0].payment_id, 'cv-revamp-abc');
  assert.equal(writes.payments[0].status, 'confirmed');
});

test('notify route refuses the forged confirmation from the finding', async (t) => {
  withPassphrase(t, PASSPHRASE);
  const writes = fakeSupabase(t);
  const forged = 'm_payment_id=cv-revamp-anything&payment_status=COMPLETE&amount_gross=400.00&custom_str1=cv-revamp&email_address=a%40example.com';

  const response = await postItn(`${forged}&signature=${md5(forged)}`);

  assert.equal(response.status, 400);
  assert.deepEqual(writes.payments, []);
  assert.equal(writes.payment_webhook_events[0].reason, 'invalid_signature');
});

test('notify route refuses a signed checkout form replayed as an ITN', async (t) => {
  withPassphrase(t, PASSPHRASE);
  const writes = fakeSupabase(t);
  // Anyone can get these fields from /api/payfast/checkout for a payment ID of
  // their choosing, and they carry a genuine keyed signature.
  const { signature, ...signed } = createPayFastCheckoutFields(asyncServices['cv-revamp'], 'cv-revamp-victim');

  for (const body of [
    `${new URLSearchParams(signed)}&signature=${signature}`,
    `${new URLSearchParams(signed)}&payment_status=&signature=${signature}`,
  ]) {
    const response = await postItn(body);

    assert.equal(response.status, 400);
    assert.deepEqual(writes.payments, []);
  }
});
