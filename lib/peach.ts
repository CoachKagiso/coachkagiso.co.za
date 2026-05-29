import crypto from 'node:crypto';
import { getSiteUrl } from '@/lib/env';
import type { AsyncService } from '@/lib/buying-flow';

type PeachMode = 'sandbox' | 'live';
type PeachFields = Record<string, string>;

type PeachCheckoutOptions = {
  amountOverride?: number;
  upgradeToken?: string;
};

type PeachCheckoutResponse = {
  checkoutId?: string;
  redirectUrl?: string;
  [key: string]: unknown;
};

const PEACH_SUCCESSFUL_RESULT_CODE = /^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[12]10)/;
const PEACH_PENDING_RESULT_CODE = /^(000\.200|800\.400\.5|100\.400\.500)/;

function getPeachMode(): PeachMode {
  return process.env.PEACH_MODE?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox';
}

function requirePeachEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function getPeachAuthBaseUrl() {
  const override = process.env.PEACH_AUTH_BASE_URL?.trim();
  if (override) return override.replace(/\/$/, '');

  return getPeachMode() === 'live'
    ? 'https://dashboard.peachpayments.com'
    : 'https://sandbox-dashboard.peachpayments.com';
}

function getPeachCheckoutBaseUrl() {
  const override = process.env.PEACH_CHECKOUT_BASE_URL?.trim();
  if (override) return override.replace(/\/$/, '');

  return getPeachMode() === 'live'
    ? 'https://secure.peachpayments.com'
    : 'https://testsecure.peachpayments.com';
}

function getPeachSecretToken() {
  return requirePeachEnv('PEACH_SECRET_TOKEN');
}

export function createPeachMerchantTransactionId() {
  return `CK${crypto.randomBytes(7).toString('hex')}`;
}

export function createPeachNonce() {
  return crypto.randomUUID();
}

export function createPeachSignature(fields: PeachFields) {
  const message = Object.keys(fields)
    .filter((key) => key !== 'signature')
    .sort()
    .map((key) => `${key}${fields[key] ?? ''}`)
    .join('');

  return crypto.createHmac('sha256', getPeachSecretToken()).update(message).digest('hex');
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function validatePeachSignature(fields: PeachFields) {
  const received = fields.signature?.toLowerCase();
  if (!received) return false;

  const expected = createPeachSignature(fields).toLowerCase();
  return timingSafeEqualHex(received, expected);
}

function flattenPayload(value: unknown, prefix = ''): PeachFields {
  if (value === null || value === undefined) return {};

  if (Array.isArray(value)) {
    return { [prefix]: JSON.stringify(value) };
  }

  if (typeof value === 'object') {
    const output: PeachFields = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const nestedPrefix = prefix ? `${prefix}.${key}` : key;
      Object.assign(output, flattenPayload(nestedValue, nestedPrefix));
    }
    return output;
  }

  return { [prefix]: String(value) };
}

export async function parsePeachRequestFields(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return flattenPayload(await request.json());
  }

  const body = await request.text();
  return Object.fromEntries(new URLSearchParams(body).entries());
}

async function getPeachAccessToken() {
  const response = await fetch(`${getPeachAuthBaseUrl()}/api/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      clientId: requirePeachEnv('PEACH_CLIENT_ID'),
      clientSecret: requirePeachEnv('PEACH_CLIENT_SECRET'),
      merchantId: requirePeachEnv('PEACH_MERCHANT_ID'),
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({})) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || `Peach authentication failed with ${response.status}`);
  }

  return data.access_token;
}

export async function createPeachCheckout(
  service: AsyncService,
  paymentId: string,
  merchantTransactionId: string,
  options: PeachCheckoutOptions = {},
) {
  const token = await getPeachAccessToken();
  const siteUrl = getSiteUrl();
  const amount = Number((options.amountOverride ?? service.amount).toFixed(2));
  const checkoutBody = {
    authentication: {
      entityId: requirePeachEnv('PEACH_ENTITY_ID'),
    },
    merchantTransactionId,
    merchantInvoiceId: paymentId,
    amount,
    currency: 'ZAR',
    paymentType: 'DB',
    nonce: createPeachNonce(),
    shopperResultUrl: `${siteUrl}/api/peach/return`,
    notificationUrl: `${siteUrl}/api/peach/webhook`,
    customParameters: {
      auxData: JSON.stringify({
        paymentId,
        serviceSlug: service.slug,
        upgradeToken: options.upgradeToken || null,
      }),
    },
    originator: 'coach-kagiso',
    returnTo: 'STORE',
  };

  const response = await fetch(`${getPeachCheckoutBaseUrl()}/v2/checkout`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      accept: 'application/json',
      referer: `${siteUrl}/buy/${service.slug}`,
      origin: siteUrl,
    },
    body: JSON.stringify(checkoutBody),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({})) as PeachCheckoutResponse;
  if (!response.ok || !data.redirectUrl) {
    const detail = typeof data.result === 'object' ? JSON.stringify(data.result) : JSON.stringify(data);
    throw new Error(`Peach checkout creation failed with ${response.status}: ${detail}`);
  }

  return {
    checkoutId: data.checkoutId || '',
    redirectUrl: data.redirectUrl,
    request: checkoutBody,
    response: data,
  };
}

export function getPeachResultCode(fields: PeachFields) {
  return fields['result.code'] || fields.result_code || fields.result || '';
}

export function getPeachResultDescription(fields: PeachFields) {
  return fields['result.description'] || fields.result_description || '';
}

export function getPeachPaymentStatus(fields: PeachFields): 'pending' | 'confirmed' | 'failed' {
  const resultCode = getPeachResultCode(fields);

  if (PEACH_SUCCESSFUL_RESULT_CODE.test(resultCode)) return 'confirmed';
  if (PEACH_PENDING_RESULT_CODE.test(resultCode)) return 'pending';
  return 'failed';
}

export function getPeachBuyerName(fields: PeachFields) {
  return [fields['customer.givenName'], fields['customer.surname']]
    .filter(Boolean)
    .join(' ')
    .trim() || fields['card.holder'] || '';
}

export function getPeachBuyerEmail(fields: PeachFields) {
  return fields['customer.email'] || fields.email || '';
}

export function getPeachAuxData(fields: PeachFields) {
  const raw = fields['customParameters.auxData'] || fields['customParameters[auxData]'] || '';
  if (!raw) return {};

  try {
    return JSON.parse(raw) as { paymentId?: string; serviceSlug?: string; upgradeToken?: string | null };
  } catch {
    return {};
  }
}
