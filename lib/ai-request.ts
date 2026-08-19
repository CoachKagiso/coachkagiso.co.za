// Explicit .ts extension so the node --experimental-strip-types test runner can resolve it.
import { modelRequiresReasoning } from './ai-models.ts';

export type AiRequestProvider = 'zai' | 'openrouter';

/**
 * Whether the model will actually spend tokens thinking. Some endpoints mandate reasoning, so
 * the Settings toggle being off does not mean reasoning is off for them.
 */
export function isReasoningActive(provider: AiRequestProvider, model: string, reasoningEnabled = false) {
  if (provider === 'zai') return false;
  return reasoningEnabled || modelRequiresReasoning(model);
}

/**
 * Pulls the provider's own error message out of a failed chat-completions response body, so a
 * routing failure (e.g. a model with no zero-data-retention endpoint) reaches the coach instead
 * of being swallowed behind a generic "try again."
 */
export function extractAiProviderErrorMessage(responseText: string): string | null {
  try {
    const parsed = JSON.parse(responseText) as { error?: { message?: string } | string };
    if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error.trim();
    if (parsed?.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string' && parsed.error.message.trim()) {
      return parsed.error.message.trim();
    }
  } catch {
    // Not JSON — nothing to extract, the caller falls back to a generic message.
  }
  return null;
}

export function getAiProviderRequestOptions(provider: AiRequestProvider, model: string, reasoningEnabled = false) {
  if (provider === 'zai') {
    return { thinking: { type: 'disabled' } };
  }

  // Sending the disable to an endpoint that mandates reasoning is rejected outright, so those
  // models fall through to their own default instead.
  if (!reasoningEnabled && !modelRequiresReasoning(model)) {
    return { reasoning: { effort: 'none' } };
  }

  return {};
}
