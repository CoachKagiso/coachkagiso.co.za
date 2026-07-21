import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getAiProviderRequestOptions } from '@/lib/ai-request';
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

export function buildAiRequestBody(
  runtime: AiRuntimeConfig,
  payload: Record<string, unknown>,
) {
  return {
    ...payload,
    ...getAiProviderRequestOptions(runtime.provider, runtime.model, runtime.reasoningEnabled),
  };
}
