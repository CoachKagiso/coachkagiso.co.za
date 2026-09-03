export type AiModelOption = {
  value: string;
  label: string;
  /**
   * Provider intelligence score. Optional because some endpoints publish no
   * score; the dropdown hides the badge when it is absent.
   */
  intelligence?: number;
  inputPrice: number;
  outputPrice: number;
  /**
   * Endpoints that reject `reasoning: { effort: 'none' }` outright rather than ignoring it.
   * The Settings reasoning toggle cannot turn thinking off for these, so the request is sent
   * without the disable instead of being rejected.
   */
  requiresReasoning?: boolean;
  /**
   * Whether the endpoint accepts image content. Image requests fall back to a capable model
   * when the configured one is text only, so an attachment never fails on model choice alone.
   * Verify these against the provider before relying on them.
   */
  supportsVision?: boolean;
  /**
   * Preview or cloaked endpoints. Never chosen automatically: they can vanish,
   * change behaviour, or - as with the DeepSeek vision preview - be unreachable
   * under a data policy that denies training, which surfaces as a 404 on every
   * request rather than as a model that simply performs badly.
   */
  experimental?: boolean;
};

export const ZAI_TEST_MODEL = 'glm-5.2';
export const DEFAULT_OPENROUTER_PRIMARY_MODEL = 'z-ai/glm-5.2';
export const DEFAULT_OPENROUTER_SECONDARY_MODEL = 'z-ai/glm-5.2';

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[
] = [
  { value: 'anthropic/claude-opus-5', label: 'anthropic/claude-opus-5', intelligence: 63.1, inputPrice: 5.0, outputPrice: 25.0, supportsVision: true },
  { value: 'meta/muse-spark-1.3', label: 'meta/muse-spark-1.3', intelligence: 61, inputPrice: 1.25, outputPrice: 4.25, requiresReasoning: true, supportsVision: true },
  { value: 'x-ai/grok-4.6', label: 'x-ai/grok-4.6', intelligence: 60.9, inputPrice: 2.0, outputPrice: 6.0, supportsVision: true },
  { value: 'openai/gpt-5.6-sol', label: 'openai/gpt-5.6-sol', intelligence: 60.9, inputPrice: 2.0, outputPrice: 10.0, supportsVision: true },
  { value: 'moonshotai/kimi-k3', label: 'moonshotai/kimi-k3', intelligence: 59.7, inputPrice: 2.6, outputPrice: 13.0, supportsVision: true },
  // GLM-5.3 began refusing the reasoning disable in August 2026. The retry in
  // postAiChat recovers either way, but flagging it keeps the Settings toggle
  // honest - unflagged it read OFF while reasoning was happening anyway - and
  // saves a wasted round trip on every call.
  { value: 'z-ai/glm-5.3', label: 'z-ai/glm-5.3', intelligence: 59.5, inputPrice: 1.40, outputPrice: 4.40, requiresReasoning: true },
  // Like its full-size sibling, the Flash variant uses forced thinking - Z.ai
  // rejects `thinking.type: 'disabled'` for both, which surfaces on OpenRouter
  // as a rejected `reasoning: { effort: 'none' }`.
  { value: 'z-ai/glm-5.3-flash', label: 'z-ai/glm-5.3-flash', intelligence: 59.5, inputPrice: 0.15, outputPrice: 0.50, requiresReasoning: true, supportsVision: true },
  { value: 'openai/gpt-5.6-terra-pro', label: 'openai/gpt-5.6-terra-pro', intelligence: 56.6, inputPrice: 2.0, outputPrice: 12.0, supportsVision: true },
  { value: 'google/gemini-3.7-flash', label: 'google/gemini-3.7-flash', intelligence: 56, inputPrice: 0.375, outputPrice: 1.875, requiresReasoning: true, supportsVision: true },
  { value: 'z-ai/glm-5.2', label: 'z-ai/glm-5.2', intelligence: 52.6, inputPrice: 0.336, outputPrice: 1.056 },
  { value: 'deepseek/deepseek-v4-flash-0731', label: 'deepseek/deepseek-v4-flash-0731', intelligence: 52, inputPrice: 0.0786, outputPrice: 0.1572 },
  // Cheap vision endpoint for OCR: the images bill as input, but the pass
  // emits the full transcript of every slide. Experimental, so treat
  // availability as temporary.
  { value: 'deepseek/deepseek-v4-flash-vision-exp', label: 'deepseek/deepseek-v4-flash-vision-exp', inputPrice: 0.22, outputPrice: 0.66, supportsVision: true, experimental: true },
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

const visionCapableModels = new Set(
  OPENROUTER_MODEL_OPTIONS.filter((option) => option.supportsVision).map((option) => option.value),
);

export function modelSupportsVision(model: unknown) {
  return typeof model === 'string' && visionCapableModels.has(model);
}

/**
 * Used when an image is attached but the configured model cannot read images.
 * Experimental endpoints are excluded from automatic fallback and only used
 * when explicitly selected.
 */
export function getFallbackVisionModel() {
  const visionModels = OPENROUTER_MODEL_OPTIONS.filter((option) => option.supportsVision);
  // Experimental endpoints are opt-in only. Cheapness must not make a preview
  // model the silent default for reading documents.
  const stable = visionModels.filter((option) => !option.experimental);
  const pool = stable.length > 0 ? stable : visionModels;
  return pool.sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice))[0]?.value || null;
}
