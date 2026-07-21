const SENSITIVE_INTAKE_KEY = /full.?name|email|phone|mobile|contact|address|id.?number|identity|date.?of.?birth|\bdob\b|salary|bank|account/i;

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isAllowedClientStrategyCvUrl(value: string, supabaseUrl: string) {
  const url = safeUrl(value);
  const configuredSupabase = safeUrl(supabaseUrl);
  if (!url || !configuredSupabase || url.protocol !== 'https:' || url.username || url.password) return false;

  const hostname = url.hostname.toLowerCase();
  const supabaseHostname = configuredSupabase.hostname.toLowerCase();
  return hostname === supabaseHostname || hostname === 'cal.com' || hostname.endsWith('.cal.com');
}

export function extractSupabaseStorageLocation(value: string, supabaseUrl: string) {
  const url = safeUrl(value);
  const configuredSupabase = safeUrl(supabaseUrl);
  if (!url || !configuredSupabase || url.hostname !== configuredSupabase.hostname) return null;

  const prefixes = [
    '/storage/v1/object/sign/',
    '/storage/v1/object/public/',
    '/storage/v1/object/authenticated/',
  ];
  const prefix = prefixes.find((candidate) => url.pathname.startsWith(candidate));
  if (!prefix) return null;

  const parts = url.pathname
    .slice(prefix.length)
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  if (parts.length < 2 || parts.some((part) => part === '.' || part === '..')) return null;

  return {
    bucket: parts[0],
    path: parts.slice(1).join('/'),
  };
}

export function redactClientStrategySourceText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/\b\d{13}\b/g, '[redacted]')
    .replace(/(?<!\d)(?:\+27|0)[\s()-]*\d{2}[\s()-]*\d{3}[\s()-]*\d{4}(?!\d)/g, '[redacted]')
    .trim();
}

function sanitizeIntakeValue(value: unknown): unknown {
  if (typeof value === 'string') return redactClientStrategySourceText(value);
  if (Array.isArray(value)) return value.map(sanitizeIntakeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, child]) => {
    if (!SENSITIVE_INTAKE_KEY.test(key)) result[key] = sanitizeIntakeValue(child);
    return result;
  }, {});
}

export function sanitizeClientStrategyIntake(value: Record<string, unknown>) {
  return sanitizeIntakeValue(value) as Record<string, unknown>;
}

