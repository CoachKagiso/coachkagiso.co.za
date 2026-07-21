import { NextResponse } from 'next/server';
import { DASHBOARD_SESSION_COOKIE_NAME } from '@/lib/dashboard-session';

const DASHBOARD_PATH = '/resources/career-diagnostic/submissions';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(DASHBOARD_PATH, request.url), 303);
  response.cookies.set(DASHBOARD_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  response.headers.set('cache-control', 'no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  return response;
}
