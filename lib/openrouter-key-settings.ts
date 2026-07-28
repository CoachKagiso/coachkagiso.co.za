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

export function mergeOpenRouterKeyForSave(currentValue: unknown, nextValue: unknown): ConfigRecord {
  const current = asConfigRecord(currentValue);
  const next = asConfigRecord(nextValue);
  const submittedKey = typeof next.openrouter_api_key === 'string' ? next.openrouter_api_key.trim() : '';
  const savedKey = typeof current.openrouter_api_key === 'string' ? current.openrouter_api_key.trim() : '';
  const { openrouter_api_key_configured: _configured, ...persistedNext } = next;

  return {
    ...persistedNext,
    openrouter_api_key: submittedKey || savedKey,
  };
}
