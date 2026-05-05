import crypto from 'node:crypto';
import { getSiteUrl } from '@/lib/env';
import type { AsyncService } from '@/lib/buying-flow';

type PayFastFields = Record<string, string>;

function encodePayFastValue(value: string) {
  return encodeURIComponent(value.trim()).replace(/%20/g, '+');
}

export function createPayFastSignature(fields: PayFastFields, passphrase?: string) {
  const pairs = Object.entries(fields)
    .filter(([key, value]) => key !== 'signature' && value !== '')
    .map(([key, value]) => `${key}=${encodePayFastValue(value)}`);

  if (passphrase) {
    pairs.push(`passphrase=${encodePayFastValue(passphrase)}`);
  }

  return crypto.createHash('md5').update(pairs.join('&')).digest('hex');
}

export function validatePayFastSignature(fields: PayFastFields) {
  const received = fields.signature;
  if (!received) return false;
  const expected = createPayFastSignature(fields, process.env.PAYFAST_PASSPHRASE);
  return received.toLowerCase() === expected.toLowerCase();
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
