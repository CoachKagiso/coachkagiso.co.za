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

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[] = [
  { value: 'anthropic/claude-opus-5', label: 'anthropic/claude-opus-5', intelligence: 63.1, inputPrice: 5.0, outputPrice: 25.0, supportsVision: true },
  { value: 'x-ai/grok-4.6', label: 'x-ai/grok-4.6', intelligence: 60.9, inputPrice: 2.0, outputPrice: 6.0, supportsVision: true },
  { value: 'moonshotai/kimi-k3', label: 'moonshotai/kimi-k3', intelligence: 59.7, inputPrice: 2.6, outputPrice: 13.0, supportsVision: true },
  // GLM-5.3 began refusing the reasoning disable in August 2026. The retry in
  // postAiChat recovers either way, but flagging it keeps the Settings toggle
  // honest - unflagged it read OFF while reasoning was happening anyway - and
  // saves a wasted round trip on every call.
  { value: 'z-ai/glm-5.3', label: 'z-ai/glm-5.3', intelligence: 59.5, inputPrice: 1.40, outputPrice: 4.40, requiresReasoning: true },
  { value: 'openai/gpt-5.6-sol', label: 'openai/gpt-5.6-sol', intelligence: 59, inputPrice: 5.0, outputPrice: 30.0, supportsVision: true },
  { value: 'meta/muse-spark-1.2', label: 'meta/muse-spark-1.2', intelligence: 56.8, inputPrice: 1.25, outputPrice: 4.25, supportsVision: true },
  { value: 'openai/gpt-5.6-terra-pro', label: 'openai/gpt-5.6-terra-pro', intelligence: 56, inputPrice: 1.25, outputPrice: 7.5, supportsVision: true },
  { value: 'google/gemini-3.7-flash', label: 'google/gemini-3.7-flash', intelligence: 56, inputPrice: 0.375, outputPrice: 1.875, requiresReasoning: true, supportsVision: true },
  { value: 'deepseek/deepseek-v4-flash-0731', label: 'deepseek/deepseek-v4-flash-0731', intelligence: 52, inputPrice: 0.0786, outputPrice: 0.1572 },
  { value: 'z-ai/glm-5.2', label: 'z-ai/glm-5.2', intelligence: 51, inputPrice: 0.49, outputPrice: 1.54 },
  { value: 'minimax/minimax-m3', label: 'minimax/minimax-m3', intelligence: 44, inputPrice: 0.22, outputPrice: 1.2, supportsVision: true },
  { value: 'xiaomi/mimo-v2.5-pro', label: 'xiaomi/mimo-v2.5-pro', intelligence: 42, inputPrice: 0.44, outputPrice: 0.87 },
  // Same input price as minimax with cheaper output, which is the half that
  // matters for OCR: the images bill as input, but the pass emits the full
  // transcript of every slide. Experimental, so treat availability as temporary.
  { value: 'deepseek/deepseek-v4-flash-vision-exp', label: 'deepseek/deepseek-v4-flash-vision-exp', inputPrice: 0.22, outputPrice: 0.66, supportsVision: true, experimental: true },
  // Free while cloaked, so it sorts first on price. requiresReasoning is not
  // optional here: the endpoint rejects `reasoning: { effort: 'none' }` with a
  // 400 rather than ignoring it, which made every generation fail while the
  // Settings reasoning toggle was off.
  { value: 'stealth/ox-alpha', label: 'stealth/ox-alpha', inputPrice: 0, outputPrice: 0, requiresReasoning: true, supportsVision: true, experimental: true },
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
 * For cost on high-volume tools the cheapest capable model would win, but the
 * free cloaked model (stealth/ox-alpha) is still proving stability, so it is
 * excluded from automatic fallback and only used when explicitly selected.
 */
export function getFallbackVisionModel() {
  const visionModels = OPENROUTER_MODEL_OPTIONS.filter((option) => option.supportsVision);
  // Experimental endpoints are opt-in only. Cheapness must not make a preview
  // model the silent default for reading documents.
  const stable = visionModels.filter((option) => !option.experimental);
  const pool = stable.length > 0 ? stable : visionModels;
  return pool.sort((a, b) => (a.inputPrice + a.outputPrice) - (b.inputPrice + b.outputPrice))[0]?.value || null;
}
