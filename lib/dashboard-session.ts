import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DASHBOARD_SESSION_COOKIE_NAME = 'coach_kagiso_dashboard_session';
export const DASHBOARD_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const DASHBOARD_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DASHBOARD_LOGIN_MAX_FAILURES = 5;
export const DASHBOARD_LOGIN_MAX_BODY_LENGTH = 4096;
const DASHBOARD_LOGIN_MAX_KEY_LENGTH = 512;

export type DashboardLoginAttemptState = {
  windowStartedAt: number;
  failures: number;
  blockedUntil: number | null;
};

type SessionPayload = {
  v: 1;
  iat: number;
  exp: number;
  n: string;
};

export function parseDashboardLoginKey(body: string) {
  if (body.length > DASHBOARD_LOGIN_MAX_BODY_LENGTH) return null;
  const key = String(new URLSearchParams(body).get('key') || '').trim();
  return key.length <= DASHBOARD_LOGIN_MAX_KEY_LENGTH ? key : null;
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readCookie(cookieHeader: string, name: string) {
  if (!cookieHeader || cookieHeader.length > 8192) return '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

export function createDashboardSessionToken(
  secret: string,
  options: { now?: number; nonce?: string } = {},
) {
  if (secret.length < 16) throw new Error('Dashboard session secret is not configured securely.');
  const issuedAt = Math.floor((options.now ?? Date.now()) / 1000);
  const payload: SessionPayload = {
    v: 1,
    iat: issuedAt,
    exp: issuedAt + DASHBOARD_SESSION_MAX_AGE_SECONDS,
    n: options.nonce || randomBytes(18).toString('base64url'),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyDashboardSessionToken(token: string, secret: string, now = Date.now()) {
  if (!token || !secret || token.length > 1024) return false;
  const [encodedPayload, receivedSignature, extra] = token.split('.');
  if (!encodedPayload || !receivedSignature || extra) return false;
  if (!safeEqual(receivedSignature, sign(encodedPayload, secret))) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<SessionPayload>;
    const nowSeconds = Math.floor(now / 1000);
    return payload.v === 1
      && Number.isInteger(payload.iat)
      && Number.isInteger(payload.exp)
      && typeof payload.n === 'string'
      && payload.n.length >= 12
      && Number(payload.exp) - Number(payload.iat) === DASHBOARD_SESSION_MAX_AGE_SECONDS
      && Number(payload.iat) <= nowSeconds + 300
      && nowSeconds < Number(payload.exp);
  } catch {
    return false;
  }
}

export function isDashboardRequestAuthorized(input: {
  cookieHeader?: string | null;
  providedKey?: string | null;
  secret: string;
  now?: number;
}) {
  const providedKey = input.providedKey?.trim() || '';
  if (providedKey && input.secret && safeEqual(providedKey, input.secret)) return true;
  const sessionToken = readCookie(input.cookieHeader || '', DASHBOARD_SESSION_COOKIE_NAME);
  return verifyDashboardSessionToken(sessionToken, input.secret, input.now);
}

export function getDashboardSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: DASHBOARD_SESSION_MAX_AGE_SECONDS,
    priority: 'high' as const,
  };
}

export function readDashboardLoginLimit(state: DashboardLoginAttemptState | null, now = Date.now()) {
  if (!state?.blockedUntil || state.blockedUntil <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - now) / 1000)),
  };
}

export function recordDashboardLoginFailure(
  state: DashboardLoginAttemptState | null,
  now = Date.now(),
): DashboardLoginAttemptState {
  const current = !state || now - state.windowStartedAt >= DASHBOARD_LOGIN_WINDOW_MS
    ? { windowStartedAt: now, failures: 0, blockedUntil: null }
    : state;
  const failures = current.failures + 1;
  return {
    windowStartedAt: current.windowStartedAt,
    failures,
    blockedUntil: failures >= DASHBOARD_LOGIN_MAX_FAILURES
      ? now + DASHBOARD_LOGIN_WINDOW_MS
      : current.blockedUntil,
  };
}
