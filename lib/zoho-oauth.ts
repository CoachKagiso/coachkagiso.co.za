import { randomBytes, timingSafeEqual } from 'node:crypto';

export const ZOHO_OAUTH_STATE_COOKIE = 'zoho_oauth_state';
export const ZOHO_OAUTH_STATE_MAX_AGE_SECONDS = 600;

const DEFAULT_ZOHO_ACCOUNTS_BASE_URL = 'https://accounts.zoho.com';

// Zoho runs one accounts server per data centre. Zoho tells the callback which
// one the user belongs to through the `accounts-server` query parameter, so that
// value comes from the request and is only trusted when it is one of these hosts.
const ZOHO_ACCOUNTS_HOST = /^accounts\.zoho\.(com|eu|in|com\.au|jp|com\.cn|sa|ca)$/;

function parseZohoAccountsOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
    if (!ZOHO_ACCOUNTS_HOST.test(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Picks the accounts server that receives the client secret. The request value
 * is used only when it is a genuine Zoho accounts host, otherwise the configured
 * value is used, then the default. The client secret must never be posted to a
 * host an attacker chose.
 */
export function resolveZohoAccountsBaseUrl(requested: string | null | undefined, configured?: string | null) {
  return (
    parseZohoAccountsOrigin(requested) ||
    (configured?.trim() ? configured.trim().replace(/\/$/, '') : null) ||
    DEFAULT_ZOHO_ACCOUNTS_BASE_URL
  );
}

export function createZohoOAuthState() {
  return randomBytes(24).toString('base64url');
}

export function zohoOAuthStateMatches(expected: string | null | undefined, received: string | null | undefined) {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string) {
  for (const part of (cookieHeader || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}
