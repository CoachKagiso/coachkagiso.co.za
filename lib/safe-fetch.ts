import { lookup } from 'node:dns/promises';

export const MAX_SAFE_FETCH_REDIRECTS = 3;
export const MAX_SAFE_FETCH_BYTES = 512 * 1024;
export const SAFE_FETCH_TIMEOUT_MS = 7000;

export type SafeFetchErrorCode = 'URL_NOT_ALLOWED' | 'REDIRECT_BLOCKED';

export class SafeFetchError extends Error {
  code: SafeFetchErrorCode;

  constructor(code: SafeFetchErrorCode) {
    super(code);
    this.name = 'SafeFetchError';
    this.code = code;
  }
}

const deniedHostNames = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
]);

const deniedHostSuffixes = ['.localhost', '.local', '.internal', '.home.arpa'];

function normalizeHost(hostname: string) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

function isDeniedIpv4(host: string) {
  const parts = host.split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;

  const [a, b] = octets;
  if (a === 0) return true;                                  // 0.0.0.0/8 "this network"
  if (a === 10) return true;                                 // private
  if (a === 100 && b >= 64 && b <= 127) return true;         // CGNAT 100.64/10
  if (a === 127) return true;                                // loopback, all of 127/8
  if (a === 169 && b === 254) return true;                   // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;          // private
  if (a === 192 && b === 168) return true;                   // private
  if (a === 198 && (b === 18 || b === 19)) return true;       // benchmarking 198.18/15
  if (a >= 224) return true;                                 // multicast, reserved, broadcast

  const prefix = octets.slice(0, 3).join('.');
  // IETF protocol assignments, TEST-NET-1/2/3, and the 6to4 relay anycast block.
  return ['192.0.0', '192.0.2', '192.88.99', '198.51.100', '203.0.113'].includes(prefix);
}

/**
 * Rejects hostnames that point at the loopback interface, a private network, or cloud
 * metadata. Alternate IPv4 encodings (decimal, hex, octal) need no handling here because
 * the WHATWG URL parser normalizes them before this ever sees them - see the tests.
 */
export function isDeniedHost(hostname: string) {
  const host = normalizeHost(hostname);
  if (!host) return true;

  // Deny every IPv6 literal outright. The assistant only fetches URLs Kagiso pastes, which
  // are hostnames, so this has no realistic false positive - and it covers ::1, fc00::/7,
  // fe80::/10, ::ffff:169.254.169.254, and NAT64 without an IPv6 parser to get wrong.
  if (host.includes(':')) return true;

  if (deniedHostNames.has(host)) return true;
  if (deniedHostSuffixes.some((suffix) => host.endsWith(suffix))) return true;

  return isDeniedIpv4(host);
}

export function isFetchableHttpUrl(value: string | URL) {
  let parsed: URL;
  try {
    parsed = value instanceof URL ? value : new URL(value);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;
  return !isDeniedHost(parsed.hostname);
}

const ipv4Literal = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/**
 * A public hostname can still resolve to a private address, so the name check alone is not
 * enough. Known residual risk: this is TOCTOU. Node re-resolves at connect time, so a hostile
 * DNS server with a zero-TTL record can rebind between this check and the connection. Closing
 * that would need a custom undici dispatcher, which is disproportionate for this use.
 */
async function assertPublicDns(hostname: string) {
  const host = normalizeHost(hostname);
  if (ipv4Literal.test(host)) return;

  const records = await lookup(host, { all: true }).catch(() => []);
  if (records.length === 0) throw new SafeFetchError('URL_NOT_ALLOWED');
  if (records.some((record) => isDeniedHost(record.address))) {
    throw new SafeFetchError('URL_NOT_ALLOWED');
  }
}

/**
 * Reads a response body as text, stopping at a byte ceiling. Truncates rather than throwing:
 * callers only need the head of the document, so partial text is still useful.
 */
export async function readBoundedText(response: Response, maxBytes = MAX_SAFE_FETCH_BYTES) {
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize && declaredSize <= maxBytes) return response.text();
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let total = 0;

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      text += decoder.decode(
        total > maxBytes ? value.subarray(0, value.byteLength - (total - maxBytes)) : value,
        { stream: true },
      );
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return text + decoder.decode();
}

/**
 * Fetches a public URL, re-validating the host on every redirect hop. Redirects are followed
 * manually because the default `redirect: 'follow'` would let a public URL bounce the request
 * to an internal address without the deny-list ever seeing it.
 */
export async function fetchPublicUrl(
  rawUrl: string,
  options: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    maxRedirects?: number;
  } = {},
): Promise<{ response: Response; finalUrl: URL }> {
  const maxRedirects = options.maxRedirects ?? MAX_SAFE_FETCH_REDIRECTS;
  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl);
  } catch {
    throw new SafeFetchError('URL_NOT_ALLOWED');
  }

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (!isFetchableHttpUrl(currentUrl)) throw new SafeFetchError('URL_NOT_ALLOWED');
    await assertPublicDns(currentUrl.hostname);

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs ?? SAFE_FETCH_TIMEOUT_MS),
      headers: options.headers,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => {});
      if (!location || hop === maxRedirects) throw new SafeFetchError('REDIRECT_BLOCKED');
      try {
        currentUrl = new URL(location, currentUrl);
      } catch {
        throw new SafeFetchError('URL_NOT_ALLOWED');
      }
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new SafeFetchError('REDIRECT_BLOCKED');
}
