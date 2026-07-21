export type AiModelOption = {
  value: string;
  label: string;
  intelligence: number;
  inputPrice: number;
  outputPrice: number;
};

export const ZAI_TEST_MODEL = 'glm-5.2';
export const DEFAULT_OPENROUTER_PRIMARY_MODEL = 'z-ai/glm-5.2';
export const DEFAULT_OPENROUTER_SECONDARY_MODEL = 'z-ai/glm-5.2';

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[] = [
  { value: 'anthropic/claude-fable-5', label: 'anthropic/claude-fable-5', intelligence: 60, inputPrice: 10.0, outputPrice: 50.0 },
  { value: 'openai/gpt-5.6-sol', label: 'openai/gpt-5.6-sol', intelligence: 59, inputPrice: 5.0, outputPrice: 30.0 },
  { value: 'moonshotai/kimi-k3', label: 'moonshotai/kimi-k3', intelligence: 57, inputPrice: 3.0, outputPrice: 15.0 },
  { value: 'anthropic/claude-opus-4.8', label: 'anthropic/claude-opus-4.8', intelligence: 56, inputPrice: 5.0, outputPrice: 25.0 },
  { value: 'x-ai/grok-4.5', label: 'x-ai/grok-4.5', intelligence: 54, inputPrice: 2.0, outputPrice: 6.0 },
  { value: 'z-ai/glm-5.2', label: 'z-ai/glm-5.2', intelligence: 51, inputPrice: 0.28, outputPrice: 0.88 },
  { value: 'deepseek/deepseek-v4-pro', label: 'deepseek/deepseek-v4-pro', intelligence: 44, inputPrice: 0.18, outputPrice: 0.87 },
  { value: 'minimax/minimax-m3', label: 'minimax/minimax-m3', intelligence: 44, inputPrice: 0.22, outputPrice: 1.2 },
  { value: 'xiaomi/mimo-v2.5-pro', label: 'xiaomi/mimo-v2.5-pro', intelligence: 42, inputPrice: 0.44, outputPrice: 0.87 },
];

const openRouterModelValues = new Set(OPENROUTER_MODEL_OPTIONS.map((option) => option.value));

export function isOpenRouterProductionModel(value: unknown): value is string {
  return typeof value === 'string' && openRouterModelValues.has(value);
}

export function normalizeOpenRouterModel(value: unknown, fallback: string) {
  return isOpenRouterProductionModel(value) ? value : fallback;
}
