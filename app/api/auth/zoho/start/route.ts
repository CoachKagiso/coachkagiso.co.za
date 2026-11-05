import { NextResponse } from 'next/server';
import { isDiagnosticAdminAuthorized } from '@/lib/diagnostic-submissions';
import { getSiteUrl } from '@/lib/env';
import { ZOHO_OAUTH_STATE_COOKIE, ZOHO_OAUTH_STATE_MAX_AGE_SECONDS, createZohoOAuthState } from '@/lib/zoho-oauth';

export const dynamic = 'force-dynamic';

const zohoScopes = [
  'ZohoMail.accounts.READ',
  'ZohoMail.folders.READ',
  'ZohoMail.messages.READ',
];

function getRedirectUri() {
  return process.env.ZOHO_AUTH_REDIRECT_URI || `${getSiteUrl()}/api/auth/zoho/callback`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const clientId = process.env.ZOHO_MAIL_CLIENT_ID?.trim();

  if (!isDiagnosticAdminAuthorized(key, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!clientId) {
    return NextResponse.json({ error: 'ZOHO_MAIL_CLIENT_ID is missing.' }, { status: 503 });
  }

  const authUrl = new URL(`${process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com'}/oauth/v2/auth`);
  authUrl.searchParams.set('scope', zohoScopes.join(','));
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', getRedirectUri());
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  // The callback is public, because Zoho redirects the browser there, so it only
  // proceeds for a flow that started here: it must see this state in its cookie.
  const state = createZohoOAuthState();
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(ZOHO_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/zoho',
    maxAge: ZOHO_OAUTH_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
