export type AiModelOption = {
  value: string;
  label: string;
};

export const ZAI_TEST_MODEL = 'glm-5.1';
export const OPENROUTER_KIMI_K2_6_FREE_MODEL = 'moonshotai/kimi-k2.6:free';
export const OPENROUTER_NEMOTRON_3_ULTRA_FREE_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const DEFAULT_OPENROUTER_PRIMARY_MODEL = OPENROUTER_KIMI_K2_6_FREE_MODEL;
export const DEFAULT_OPENROUTER_SECONDARY_MODEL = 'google/gemini-flash-3.1';

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[] = [
  { value: OPENROUTER_NEMOTRON_3_ULTRA_FREE_MODEL, label: 'nvidia/nemotron-3-ultra-550b-a55b:free' },
  { value: OPENROUTER_KIMI_K2_6_FREE_MODEL, label: 'moonshotai/kimi-k2.6:free' },
  { value: 'google/gemini-pro-3.1', label: 'google/gemini-pro-3.1' },
  { value: 'google/gemini-flash-3.1', label: 'google/gemini-flash-3.1' },
  { value: 'google/gemini-3.5-flash', label: 'google/gemini-3.5-flash' },
  { value: 'xiaomi/mimo-v2.5-pro', label: 'xiaomi/mimo-v2.5-pro' },
];

const openRouterModelValues = new Set(OPENROUTER_MODEL_OPTIONS.map((option) => option.value));

export function isOpenRouterProductionModel(value: unknown): value is string {
  return typeof value === 'string' && openRouterModelValues.has(value);
}

export function normalizeOpenRouterModel(value: unknown, fallback: string) {
  return isOpenRouterProductionModel(value) ? value : fallback;
}
