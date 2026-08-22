import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getAiProviderRequestOptions, isReasoningActive } from '@/lib/ai-request';
import { buildProviderPreferences, type AiRequestOptions } from '@/lib/ai-provider-preferences';
import { DEFAULT_SETTINGS, type AiConfigSettings } from '@/lib/settings';
import {
  DEFAULT_OPENROUTER_PRIMARY_MODEL,
  DEFAULT_OPENROUTER_SECONDARY_MODEL,
  normalizeOpenRouterModel,
} from '@/lib/ai-models';

export type AiProvider = 'zai' | 'openrouter';

export type AiRuntimeConfig = {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  headers: Record<string, string>;
  isTestMode: boolean;
  reasoningEnabled: boolean;
};

export const SIMPLE_AI_MODES = new Set(['polish', 'format_recommendation']);
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Reasoning tokens are billed from the same output budget as the answer, so a max_tokens sized
 * for the JSON alone gets spent thinking and the object arrives truncated. Routes keep stating
 * the budget their content needs; this adds the thinking allowance on top when it applies.
 */
const REASONING_TOKEN_HEADROOM = 4000;

export async function loadAiConfig(): Promise<AiConfigSettings> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'ai_config').single();

    if (error || !data?.value) {
      return DEFAULT_SETTINGS.ai_config;
    }

    return {
      ...DEFAULT_SETTINGS.ai_config,
      ...(data.value as Partial<AiConfigSettings>),
    };
  } catch (error) {
    console.error('AI settings lookup failed:', error);
    return DEFAULT_SETTINGS.ai_config;
  }
}

export async function resolveAiRuntimeConfig(options: { simpleMode?: boolean } = {}): Promise<AiRuntimeConfig | null> {
  const config = await loadAiConfig();
  const openRouterApiKey = config.openrouter_api_key?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';

  if (!openRouterApiKey) {
    return null;
  }

  return {
    provider: 'openrouter',
    baseUrl: OPENROUTER_BASE_URL,
    model: options.simpleMode
      ? normalizeOpenRouterModel(config.secondary_model, DEFAULT_OPENROUTER_SECONDARY_MODEL)
      : normalizeOpenRouterModel(config.primary_model, DEFAULT_OPENROUTER_PRIMARY_MODEL),
    apiKey: openRouterApiKey,
    isTestMode: false,
    reasoningEnabled: config.reasoning_enabled ?? false,
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://coachkagiso.co.za',
      'X-Title': 'Coach Kagiso Dashboard',
    },
  };
}

/**
 * Some endpoints refuse to have reasoning turned off and answer 400 rather than
 * ignoring the instruction. The catalogue carries a requiresReasoning flag for
 * the ones we know about, but providers keep turning it on for models that did
 * not need it before - it has now happened to Gemini, to the cloaked model, and
 * to GLM-5.3 - and a stale flag means every request on that model fails.
 *
 * So the flag is treated as an optimisation, not the guard. If a request is
 * refused for exactly this reason, it is retried once with the disable removed.
 */
export async function postAiChat(
  runtime: AiRuntimeConfig,
  payload: Record<string, unknown>,
  options: AiRequestOptions = {},
): Promise<Response> {
  const send = (body: Record<string, unknown>) =>
    fetch(`${runtime.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: runtime.headers,
      body: JSON.stringify(body),
    });

  const response = await send(buildAiRequestBody(runtime, payload, options));
  if (response.status !== 400) return response;

  // The body can only be read once, so clone before inspecting it.
  const text = await response.clone().text();
  if (!/reasoning is mandatory/i.test(text)) return response;

  console.warn(`Reasoning is mandatory for ${runtime.model}; retrying without the disable.`);
  return send(buildAiRequestBody({ ...runtime, reasoningEnabled: true }, payload, options));
}

export function buildAiRequestBody(
  runtime: AiRuntimeConfig,
  payload: Record<string, unknown>,
  options: AiRequestOptions = {},
): Record<string, unknown> {
  // `provider` is pulled out of the payload so exactly one provider key can survive the
  // spread, and it is always the merged one.
  const { provider: payloadProvider, ...rest } = payload;
  const provider = buildProviderPreferences(runtime.provider, options, payloadProvider);
  const needsReasoningHeadroom = typeof rest.max_tokens === 'number'
    && isReasoningActive(runtime.provider, runtime.model, runtime.reasoningEnabled);

  return {
    ...rest,
    ...(needsReasoningHeadroom
      ? { max_tokens: (rest.max_tokens as number) + REASONING_TOKEN_HEADROOM }
      : {}),
    ...getAiProviderRequestOptions(runtime.provider, runtime.model, runtime.reasoningEnabled),
    ...(provider ? { provider } : {}),
  };
}
