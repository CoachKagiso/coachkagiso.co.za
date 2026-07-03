export type AiModelOption = {
  value: string;
  label: string;
};

export const ZAI_TEST_MODEL = 'glm-5.2';
export const DEFAULT_OPENROUTER_PRIMARY_MODEL = 'google/gemini-pro-3.1';
export const DEFAULT_OPENROUTER_SECONDARY_MODEL = 'google/gemini-flash-3.1';

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[] = [
  { value: 'google/gemini-pro-3.1', label: 'google/gemini-pro-3.1' },
  { value: 'google/gemini-flash-3.1', label: 'google/gemini-flash-3.1' },
  { value: 'google/gemini-3.5-flash', label: 'google/gemini-3.5-flash' },
  { value: 'xiaomi/mimo-v2.5-pro', label: 'xiaomi/mimo-v2.5-pro' },
  { value: 'minimax/minimax-m3', label: 'minimax/minimax-m3' },
  { value: 'deepseek/deepseek-v4-pro', label: 'deepseek/deepseek-v4-pro' },
  { value: 'z-ai/glm-5.2', label: 'z-ai/glm-5.2' },
];

const openRouterModelValues = new Set(OPENROUTER_MODEL_OPTIONS.map((option) => option.value));

export function isOpenRouterProductionModel(value: unknown): value is string {
  return typeof value === 'string' && openRouterModelValues.has(value);
}

export function normalizeOpenRouterModel(value: unknown, fallback: string) {
  return isOpenRouterProductionModel(value) ? value : fallback;
}
