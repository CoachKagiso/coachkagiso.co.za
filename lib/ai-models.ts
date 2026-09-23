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
export const DEFAULT_OPENROUTER_PRIMARY_MODEL = 'deepseek/deepseek-v4.1-flash';
export const DEFAULT_OPENROUTER_SECONDARY_MODEL = 'deepseek/deepseek-v4.1-flash';

export const OPENROUTER_MODEL_OPTIONS: AiModelOption[
] = [
  // Intelligence scores below follow the Artificial Analysis Intelligence Index v4.3 scale
  // (10-eval composite; top of scale is now 53, so every score dropped vs v4.1).
  // The old v4.1 value sits beside each score until the new scale feels familiar.
  // AA v4.3.2 max-effort 58 (top of scale); Opus 5 was 51 on v4.3 (63.1 on v4.1).
  // 20% cheaper than Opus 5 ($4/$20 vs $5/$25). Adaptive-only thinking is
  // mandatory on OpenRouter, so the disable is never sent - see migration guide.
  { value: 'anthropic/claude-opus-5.5', label: 'anthropic/claude-opus-5.5', intelligence: 58, inputPrice: 4.0, outputPrice: 20.0, requiresReasoning: true, supportsVision: true },
  { value: 'meta/muse-spark-1.3', label: 'meta/muse-spark-1.3', intelligence: 48, inputPrice: 1.25, outputPrice: 4.25, requiresReasoning: true, supportsVision: true }, // v4.1: 61
  // AA v4.3 top open-weights score. Reasoning is opt-in (no flag needed).
  // Single Xiaomi provider on OpenRouter - launch-week throughput was volatile,
  // so treat availability as less proven than the price implies.
  { value: 'xiaomi/mimo-v2.6-pro', label: 'xiaomi/mimo-v2.6-pro', intelligence: 46, inputPrice: 0.435, outputPrice: 0.87, supportsVision: true },
  // OpenRouter marks reasoning mandatory (default high) even though xAI docs
  // describe it as switchable, so the flag stays until a disable succeeds.
  // Note 2x long-context pricing on prompts >= 200k tokens.
  { value: 'x-ai/grok-4.7', label: 'x-ai/grok-4.7', intelligence: 46, inputPrice: 1.60, outputPrice: 4.80, requiresReasoning: true, supportsVision: true },
  // Like its full-size sibling, the Flash variant uses forced thinking - Z.ai
  // rejects `thinking.type: 'disabled'` for both, which surfaces on OpenRouter
  // as a rejected `reasoning: { effort: 'none' }`.
  { value: 'z-ai/glm-5.3-flash', label: 'z-ai/glm-5.3-flash', intelligence: 42, inputPrice: 0.15, outputPrice: 0.50, requiresReasoning: true, supportsVision: true }, // v4.1: 59.5
  // Introductory price expires Dec 31, 2026 - list becomes $1.50/$7.50 on Jan 1, 2027.
  { value: 'google/gemini-3.8-flash', label: 'google/gemini-3.8-flash', intelligence: 41.2, inputPrice: 0.75, outputPrice: 3.75, requiresReasoning: true, supportsVision: true },
  // Production successor to both retired DeepSeek endpoints (legacy aliases
  // route to it): native vision input plus optional thinking (low/high/max),
  // so reasoning stays switchable and no flag is needed.
  { value: 'deepseek/deepseek-v4.1-flash', label: 'deepseek/deepseek-v4.1-flash', intelligence: 39.5, inputPrice: 0.15, outputPrice: 0.60, supportsVision: true },
  // No AA v4.3 score published yet, so unscored with the badge hidden rather
  // than estimated. Reasoning is opt-in via the `reasoning enabled` boolean.
  { value: 'xiaomi/mimo-v2.6-flash', label: 'xiaomi/mimo-v2.6-flash', intelligence: undefined, inputPrice: 0.14, outputPrice: 0.28, supportsVision: true },
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
