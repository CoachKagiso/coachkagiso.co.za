// Explicit .ts extension so the node --experimental-strip-types test runner can resolve it.
import { modelRequiresReasoning } from './ai-models.ts';

export type AiRequestProvider = 'zai' | 'openrouter';

/**
 * Reasoning tokens are billed from the same output budget as the answer, so a max_tokens sized
 * for the JSON alone gets spent thinking and the object arrives truncated. Routes keep stating
 * the budget their content needs; this adds the thinking allowance on top when it applies.
 *
 * The allowance scales with the answer rather than being a flat number, because the two move
 * together: a route asking for a 4k-token report hands the model far more to think about than one
 * asking for a 100-token title. A flat 4000 was enough for the short routes and not for the long
 * ones - the CV analyzer on GLM-5.3 kept finishing on `length` with the JSON cut mid-object.
 */
const MIN_REASONING_TOKEN_HEADROOM = 4000;
const REASONING_HEADROOM_RATIO = 2;

export function withReasoningHeadroom(maxTokens: number) {
  const headroom = Math.max(MIN_REASONING_TOKEN_HEADROOM, Math.round(maxTokens * REASONING_HEADROOM_RATIO));
  return maxTokens + headroom;
}

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
  // models get the cheapest effort they accept instead. Falling through to the provider default
  // would mean max effort: minutes of thinking that eats the output budget before a word of the
  // answer is visible.
  if (!reasoningEnabled && !modelRequiresReasoning(model)) {
    return { reasoning: { effort: 'none' } };
  }
  if (!reasoningEnabled) {
    return { reasoning: { effort: 'low' } };
  }

  return {};
}

/**
 * Builds the Settings "test connection" probe body. Reasoning-mandatory
 * models think before answering and bill thinking from the same output
 * budget, so the bare 20-token probe would be spent thinking before a single
 * word is visible (or rejected outright). Those models get reasoning headroom
 * plus an explicit low effort to keep the probe cheap, and no temperature
 * override - reasoning models are tuned for their default sampling.
 */
export function buildAiConnectionTestBody(model: string): Record<string, unknown> {
  const base = {
    model,
    messages: [{ role: 'user', content: 'Reply with the word CONNECTED only.' }],
  };

  if (modelRequiresReasoning(model)) {
    return {
      ...base,
      max_tokens: withReasoningHeadroom(20),
      reasoning: { effort: 'low' },
    };
  }

  return { ...base, max_tokens: 20, temperature: 0 };
}
