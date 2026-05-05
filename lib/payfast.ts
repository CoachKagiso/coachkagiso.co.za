import crypto from 'node:crypto';
import { getSiteUrl } from '@/lib/env';
import type { AsyncService } from '@/lib/buying-flow';

type PayFastFields = Record<string, string>;

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

export function validatePayFastSignature(fields: PayFastFields) {
  const received = fields.signature;
  if (!received) return false;

  const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();
  const allowUnsignedSandboxFallback = process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true';
  const candidates = [
    createSignatureString(fields, passphrase),
    createSignatureString(fields, passphrase, true),
    ...(allowUnsignedSandboxFallback
      ? [
          createSignatureString(fields, undefined),
          createSignatureString(fields, undefined, true),
        ]
      : []),
  ];

  return candidates.some((payload) => {
    const expected = crypto.createHash('md5').update(payload).digest('hex');
    return received.toLowerCase() === expected.toLowerCase();
  });
}

export function getPayFastProcessUrl() {
  return process.env.NEXT_PUBLIC_PAYFAST_SANDBOX === 'true'
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
}

export function createPayFastCheckoutFields(service: AsyncService, paymentId: string) {
  const siteUrl = getSiteUrl();
  const fields: PayFastFields = {
    merchant_id: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID || '',
    merchant_key: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY || '',
    return_url: `${siteUrl}/thanks/${service.slug}?payment_id=${paymentId}`,
    cancel_url: `${siteUrl}/buy/${service.slug}/failed`,
    notify_url: `${siteUrl}/api/payfast/notify`,
    m_payment_id: paymentId,
    amount: service.amount.toFixed(2),
    item_name: service.title,
    custom_str1: service.slug,
  };

  return {
    ...fields,
    signature: createPayFastSignature(fields, process.env.PAYFAST_PASSPHRASE),
  };
}
