export type AiModelOption = {
  value: string;
  label: string;
  intelligence: number;
  inputPrice: number;
  outputPrice: number;
  /**
   * Endpoints that reject `reasoning: { effort: 'none' }` outright rather than ignoring it.
   * The Settings reasoning toggle cannot turn thinking off for these, so the request is sent
   * without the disable instead of being rejected.
   */
  requiresReasoning?: boolean;
};

export const ZAI_TEST_MODEL = 'glm-5.2';
export const DEFAULT_OPENROUTER_PRIMARY_MODEL = 'z-ai/glm-5.2';
export const DEFAULT_OPENROUTER_SECONDARY_MODEL = 'z-ai/glm-5.2';

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[] = [
  { value: 'anthropic/claude-opus-5', label: 'anthropic/claude-opus-5', intelligence: 61, inputPrice: 5.0, outputPrice: 25.0 },
  { value: 'openai/gpt-5.6-sol', label: 'openai/gpt-5.6-sol', intelligence: 59, inputPrice: 5.0, outputPrice: 30.0 },
  { value: 'openai/gpt-5.6-terra-pro', label: 'openai/gpt-5.6-terra-pro', intelligence: 56, inputPrice: 1.25, outputPrice: 7.5 },
  { value: 'moonshotai/kimi-k3', label: 'moonshotai/kimi-k3', intelligence: 57, inputPrice: 2.6, outputPrice: 13.0 },
  { value: 'google/gemini-3.7-flash', label: 'google/gemini-3.7-flash', intelligence: 56, inputPrice: 0.375, outputPrice: 1.875, requiresReasoning: true },
  { value: 'x-ai/grok-4.5', label: 'x-ai/grok-4.5', intelligence: 54, inputPrice: 2.0, outputPrice: 6.0 },
  { value: 'deepseek/deepseek-v4-flash-0731', label: 'deepseek/deepseek-v4-flash-0731', intelligence: 52, inputPrice: 0.0786, outputPrice: 0.1572 },
  { value: 'z-ai/glm-5.2', label: 'z-ai/glm-5.2', intelligence: 51, inputPrice: 0.49, outputPrice: 1.54 },
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

const reasoningMandatoryModels = new Set(
  OPENROUTER_MODEL_OPTIONS.filter((option) => option.requiresReasoning).map((option) => option.value),
);

export function modelRequiresReasoning(model: unknown) {
  return typeof model === 'string' && reasoningMandatoryModels.has(model);
}
