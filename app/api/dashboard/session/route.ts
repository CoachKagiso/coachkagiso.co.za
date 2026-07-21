import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  createDashboardSessionToken,
  DASHBOARD_SESSION_COOKIE_NAME,
  DASHBOARD_LOGIN_MAX_BODY_LENGTH,
  getDashboardSessionCookieOptions,
  isDashboardRequestAuthorized,
  parseDashboardLoginKey,
  readDashboardLoginLimit,
  recordDashboardLoginFailure,
  type DashboardLoginAttemptState,
} from '@/lib/dashboard-session';
import { getDiagnosticAdminKey } from '@/lib/env';

const DASHBOARD_PATH = '/resources/career-diagnostic/submissions';
const MAX_ATTEMPT_BUCKETS = 1000;
const attempts = new Map<string, DashboardLoginAttemptState>();

function hardenResponse(response: NextResponse) {
  response.headers.set('cache-control', 'no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  return response;
}

function getAttemptKey(request: Request, secret: string) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwardedFor || request.headers.get('x-real-ip')?.trim() || 'unknown';
  return createHmac('sha256', secret).update(address).digest('base64url');
}

function redirectTo(request: Request, auth?: 'invalid' | 'limited') {
  const url = new URL(DASHBOARD_PATH, request.url);
  if (auth) url.searchParams.set('auth', auth);
  return hardenResponse(NextResponse.redirect(url, 303));
}

export async function POST(request: Request) {
  const secret = getDiagnosticAdminKey();
  if (!secret) return redirectTo(request, 'invalid');

  const attemptKey = getAttemptKey(request, secret);
  const limit = readDashboardLoginLimit(attempts.get(attemptKey) || null);
  if (!limit.allowed) {
    const response = redirectTo(request, 'limited');
    response.headers.set('retry-after', String(limit.retryAfterSeconds));
    return response;
  }

  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (!Number.isFinite(contentLength) || contentLength > DASHBOARD_LOGIN_MAX_BODY_LENGTH) {
    return hardenResponse(new NextResponse('Request too large.', { status: 413 }));
  }
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
    return redirectTo(request, 'invalid');
  }
  const body = await request.text();
  const providedKey = parseDashboardLoginKey(body);
  if (providedKey === null) {
    return hardenResponse(new NextResponse('Request too large.', { status: 413 }));
  }
  const authorized = isDashboardRequestAuthorized({
    providedKey,
    secret,
  });

  if (!authorized) {
    if (attempts.size >= MAX_ATTEMPT_BUCKETS && !attempts.has(attemptKey)) {
      const oldestAttemptKey = attempts.keys().next().value;
      if (oldestAttemptKey) attempts.delete(oldestAttemptKey);
    }
    attempts.set(attemptKey, recordDashboardLoginFailure(attempts.get(attemptKey) || null));
    return redirectTo(request, 'invalid');
  }

  attempts.delete(attemptKey);
  const response = redirectTo(request);
  response.cookies.set(
    DASHBOARD_SESSION_COOKIE_NAME,
    createDashboardSessionToken(secret),
    getDashboardSessionCookieOptions(process.env.NODE_ENV === 'production'),
  );
  return response;
}
