type ConfigRecord = Record<string, unknown>;

function asConfigRecord(value: unknown): ConfigRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as ConfigRecord
    : {};
}

export function hasConfiguredOpenRouterKey(value: unknown) {
  const config = asConfigRecord(value);
  return typeof config.openrouter_api_key === 'string' && Boolean(config.openrouter_api_key.trim());
}

/**
 * Picks the key the Settings connection test should use. A freshly pasted key wins, then the
 * saved one, then the server env fallback - so switching models never requires pasting the key
 * again just to press Test. Pure so the priority order is unit-testable; the route supplies env.
 */
export function resolveOpenRouterTestKey(submittedKey: unknown, savedKey: unknown, envKey: unknown): string {
  for (const candidate of [submittedKey, savedKey, envKey]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

export function mergeOpenRouterKeyForSave(currentValue: unknown, nextValue: unknown): ConfigRecord {
  const current = asConfigRecord(currentValue);
  const next = asConfigRecord(nextValue);
  const submittedKey = typeof next.openrouter_api_key === 'string' ? next.openrouter_api_key.trim() : '';
  const savedKey = typeof current.openrouter_api_key === 'string' ? current.openrouter_api_key.trim() : '';
  // Both *_configured flags are derived server-side for display. Never persist them.
  const {
    openrouter_api_key_configured: _configured,
    zai_api_key_configured: _zaiConfigured,
    ...persistedNext
  } = next;

  return {
    ...persistedNext,
    openrouter_api_key: submittedKey || savedKey,
  };
}
