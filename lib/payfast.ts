import crypto from 'node:crypto';
import { getSiteUrl } from '@/lib/env';
import { orderPayFastCheckoutFields } from '@/lib/payfast-signature';
import type { AsyncService } from '@/lib/buying-flow';

type PayFastFields = Record<string, string>;
type PayFastCheckoutOptions = {
  amountOverride?: number;
  customFields?: Record<string, string>;
  extraReturnParams?: Record<string, string>;
  cancelUrlOverride?: string;
  payer?: {
    email: string;
    name?: string;
  };
};

export function isPayFastSandboxMode() {
  return process.env.PAYFAST_MODE?.trim().toLowerCase() === 'sandbox';
}

export function isPayFastManualMode() {
  return process.env.PAYFAST_MODE?.trim().toLowerCase() === 'manual';
}

function encodePayFastValue(value: string) {
  return encodeURIComponent(value.trim()).replace(/%20/g, '+');
}

function createSignatureString(fields: PayFastFields, passphrase?: string, sortFields = false) {
  const entries = Object.entries(fields)
    .filter(([key, value]) => key !== 'signature' && value !== '')
    .sort(([left], [right]) => (sortFields ? left.localeCompare(right) : 0));

  const pairs = entries.map(([key, value]) => `${key}=${encodePayFastValue(value)}`);

  if (passphrase) {
    pairs.push(`passphrase=${encodePayFastValue(passphrase)}`);
  }

  return pairs.join('&');
}

export function createPayFastSignature(fields: PayFastFields, passphrase?: string) {
  return crypto.createHash('md5').update(createSignatureString(fields, passphrase)).digest('hex');
}

/**
 * The passphrase is the only secret in an ITN signature: without it the
 * signature is a plain MD5 of the body that anyone can compute. Validators must
 * reject the notification when this returns nothing.
 */
function getItnPassphrase() {
  const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();

  if (!passphrase) {
    console.error('PayFast ITN rejected: PAYFAST_PASSPHRASE is not set');
  }

  return passphrase;
}

function signaturesMatch(expected: string, received: string) {
  const expectedBytes = Buffer.from(expected.toLowerCase());
  const receivedBytes = Buffer.from(received.toLowerCase());

  return expectedBytes.length === receivedBytes.length && crypto.timingSafeEqual(expectedBytes, receivedBytes);
}

/**
 * Validates a PayFast ITN signature directly from the raw POST body string.
 *
 * This avoids the decode→re-encode round trip (URLSearchParams.parse then
 * encodeURIComponent) which can introduce subtle encoding mismatches.
 * Instead, we strip the `&signature=…` pair from the raw body and append
 * the passphrase — exactly replicating what PayFast's PHP does.
 */
export function validatePayFastSignatureFromRawBody(rawBody: string, receivedSignature: string): boolean {
  if (!receivedSignature) return false;

  const passphrase = getItnPassphrase();
  if (!passphrase) return false;

  // Strip the signature field from the raw body, preserving all other fields
  // and their original URL encoding and order.
  const withoutSig = rawBody
    .split('&')
    .filter((pair) => !pair.startsWith('signature='))
    .join('&');

  // Must match the passphrase set on the PayFast dashboard.
  const candidates = [`${withoutSig}&passphrase=${encodePayFastValue(passphrase)}`];

  const match = candidates.some((sigString) => {
    const expected = crypto.createHash('md5').update(sigString).digest('hex');
    return signaturesMatch(expected, receivedSignature);
  });

  if (!match) {
    // Never log the signature strings or hashes: they contain the passphrase.
    console.info('PayFast ITN raw-body signature mismatch');
  }

  return match;
}

export function validatePayFastSignature(fields: PayFastFields) {
  const received = fields.signature;
  if (!received) return false;

  const passphrase = getItnPassphrase();
  if (!passphrase) return false;

  // Sorted is the correct method for ITN per PayFast docs; unsorted is kept as a fallback.
  const candidates = [
    // With passphrase — sorted (recommended by PayFast docs for ITN)
    createSignatureString(fields, passphrase, true),
    // With passphrase — unsorted (legacy fallback)
    createSignatureString(fields, passphrase),
  ];

  const match = candidates.some((sigString) => {
    const expected = crypto.createHash('md5').update(sigString).digest('hex');
    return signaturesMatch(expected, received);
  });

  if (!match) {
    // Never log the signature strings or hashes: they contain the passphrase.
    console.info('PayFast ITN signature mismatch');
  }

  return match;
}

export function getPayFastProcessUrl() {
  return isPayFastSandboxMode()
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
}

export function createPayFastCheckoutFields(
  service: AsyncService,
  paymentId: string,
  options: PayFastCheckoutOptions = {}
) {
  const siteUrl = getSiteUrl();
  const returnParams = new URLSearchParams({ payment_id: paymentId });

  for (const [key, value] of Object.entries(options.extraReturnParams || {})) {
    if (value) {
      returnParams.set(key, value);
    }
  }

  const fields = orderPayFastCheckoutFields({
    merchant_id: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID || '',
    merchant_key: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY || '',
    return_url: `${siteUrl}/thanks/${service.slug}?${returnParams.toString()}`,
    cancel_url: options.cancelUrlOverride || `${siteUrl}/buy/${service.slug}/failed`,
    notify_url: `${siteUrl}/api/payfast/notify`,
    ...(options.payer?.name
      ? {
          name_first: options.payer.name.trim().split(/\s+/)[0] || '',
          name_last: options.payer.name.trim().split(/\s+/).slice(1).join(' '),
        }
      : {}),
    ...(options.payer?.email ? { email_address: options.payer.email } : {}),
    m_payment_id: paymentId,
    amount: (options.amountOverride ?? service.amount).toFixed(2),
    item_name: service.title,
    custom_str1: service.slug,
    ...(options.customFields || {}),
  });

  return {
    ...fields,
    signature: createPayFastSignature(fields, process.env.PAYFAST_PASSPHRASE),
  };
}
