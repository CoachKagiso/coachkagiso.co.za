import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { getAiProviderRequestOptions } from '@/lib/ai-request';
import { DEFAULT_SETTINGS, type AiConfigSettings } from '@/lib/settings';
import {
  DEFAULT_OPENROUTER_PRIMARY_MODEL,
  DEFAULT_OPENROUTER_SECONDARY_MODEL,
  normalizeOpenRouterModel,
  ZAI_TEST_MODEL,
} from '@/lib/ai-models';

export type AiProvider = 'zai' | 'openrouter';

export type AiRuntimeConfig = {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  headers: Record<string, string>;
  isTestMode: boolean;
};

export const SIMPLE_AI_MODES = new Set(['polish', 'format_recommendation']);
const ZAI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function normalizeZaiModel(model?: string) {
  const candidate = model?.trim();
  return candidate && candidate.startsWith('glm-') ? candidate : ZAI_TEST_MODEL;
}

function buildZaiRuntime(config: AiConfigSettings, apiKey: string): AiRuntimeConfig {
  return {
    provider: 'zai',
    baseUrl: ZAI_BASE_URL,
    model: normalizeZaiModel(config.primary_model),
    apiKey,
    isTestMode: true,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
}

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
  const isTestMode = config.test_mode !== false;
  const zaiApiKey = config.zai_api_key?.trim() || process.env.ZAI_API_KEY?.trim() || '';
  const openRouterApiKey = config.openrouter_api_key?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';

  if (isTestMode) {
    return zaiApiKey ? buildZaiRuntime(config, zaiApiKey) : null;
  }

  if (!openRouterApiKey) {
    if (zaiApiKey) {
      console.warn('OpenRouter key is missing while production AI mode is active. Falling back to Z.ai test runtime.');
      return buildZaiRuntime(config, zaiApiKey);
    }
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
    ...getAiProviderRequestOptions(runtime.provider, runtime.model),
  };
}
