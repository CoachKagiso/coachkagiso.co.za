export const DASHBOARD_SESSION_CLIENT_MARKER = 'dashboard-session';

export function getDashboardLegacyKey(providedKey: string | null | undefined) {
  const normalized = providedKey?.trim() || '';
  return normalized === DASHBOARD_SESSION_CLIENT_MARKER ? '' : normalized;
}

export function buildDashboardAuthUrl(
  path: string,
  providedKey: string | null | undefined,
  values: Record<string, string | number | boolean | null | undefined> = {},
) {
  const params = new URLSearchParams();
  const legacyKey = getDashboardLegacyKey(providedKey);
  if (legacyKey) params.set('key', legacyKey);
  Object.entries(values).forEach(([name, value]) => {
    if (value !== null && value !== undefined) params.set(name, String(value));
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
