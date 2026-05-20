import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { DEFAULT_SETTINGS, type AiConfigSettings } from '@/lib/settings';

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

  if (isTestMode) {
    const apiKey = config.zai_api_key?.trim() || process.env.ZAI_API_KEY?.trim() || '';
    if (!apiKey) return null;

    return {
      provider: 'zai',
      baseUrl: 'https://api.z.ai/api/coding/paas/v4',
      model: config.primary_model || 'glm-5.1',
      apiKey,
      isTestMode: true,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
  }

  const apiKey = config.openrouter_api_key?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';
  if (!apiKey) return null;

  return {
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: options.simpleMode
      ? config.secondary_model || 'google/gemini-flash-3.1'
      : config.primary_model || 'google/gemini-pro-3.1',
    apiKey,
    isTestMode: false,
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    ...(runtime.provider === 'zai' ? { thinking: { type: 'disabled' } } : {}),
  };
}
