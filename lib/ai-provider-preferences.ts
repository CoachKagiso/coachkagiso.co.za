import type { AiRequestProvider } from '@/lib/ai-request';

export type AiRequestOptions = {
  /**
   * Adds `provider.zdr`, restricting routing to zero-data-retention providers.
   * Set this only on routes that carry real client PII, because it narrows the
   * provider pool and some models have no zero-retention endpoint.
   */
  zeroRetention?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merges the account-wide privacy floor with any provider preferences a route set itself.
 *
 * Defaults come first and the route's own object comes last, so `data_collection: 'deny'`
 * is a floor a route can deliberately override rather than a value that silently clobbers
 * an intentional routing decision.
 */
export function buildProviderPreferences(
  provider: AiRequestProvider,
  options: AiRequestOptions,
  payloadProvider: unknown,
): Record<string, unknown> | null {
  // Z.ai rejects OpenRouter's `provider` routing object, so pass through untouched.
  if (provider !== 'openrouter') {
    return isPlainObject(payloadProvider) ? payloadProvider : null;
  }

  return {
    data_collection: 'deny',
    ...(options.zeroRetention ? { zdr: true } : {}),
    ...(isPlainObject(payloadProvider) ? payloadProvider : {}),
  };
}
