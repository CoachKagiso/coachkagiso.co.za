export type SecondaryModelTool = {
  id: string;
  label: string;
  where: string;
};

export type PrimaryModelTool = SecondaryModelTool;

/**
 * High-volume, lower-stakes surfaces that run on the configured secondary model rather than the
 * primary one. They used to call Z.ai GLM directly and ignore the picker entirely; they now
 * follow Settings like everything else, and this list keeps the page honest about which model
 * governs them.
 */
export const SECONDARY_MODEL_TOOLS: readonly SecondaryModelTool[] = [
  { id: 'session-planner', label: 'Session Planner (plan, resources, and presentation)', where: 'Career Tools' },
  { id: 'reply-writer', label: 'Reply Writer', where: 'Career Tools' },
  { id: 'caption-writer', label: 'Caption Writer', where: 'Studio' },
  { id: 'smart-suggest', label: 'Smart Suggest', where: 'Studio' },
  { id: 'research-processing', label: 'Research processing', where: 'Studio' },
  { id: 'inbound-reply-drafts', label: 'Inbound email reply drafts', where: 'Messages' },
];

/**
 * Everything that resolves without `simpleMode` runs on the configured
 * primary (Active) model: the high-stakes surfaces where quality beats cost.
 * Verified against every `resolveAiRuntimeConfig` call site - anything not
 * listed here passes `simpleMode: true` and lives in SECONDARY_MODEL_TOOLS.
 */
export const PRIMARY_MODEL_TOOLS: readonly PrimaryModelTool[] = [
  { id: 'ai-assistant', label: 'AI Assistant chat', where: 'Dashboard' },
  { id: 'transform', label: 'Transform stage 1 & 2 (copyright guardrail)', where: 'Studio' },
  { id: 'studio-generation', label: 'Studio generation (posts, hooks, CTAs, Alchemy)', where: 'Studio' },
  { id: 'cv-analyzer', label: 'CV Analyzer', where: 'Career Tools' },
  { id: 'cv-builder', label: 'CV Builder', where: 'Career Tools' },
  { id: 'strategy-plan', label: 'Strategy Plan drafting', where: 'Clients' },
  { id: 'session-preparation', label: 'Session Preparation', where: 'Clients' },
  { id: 'session-evidence-suggest', label: 'Session Evidence suggestions', where: 'Clients' },
];
