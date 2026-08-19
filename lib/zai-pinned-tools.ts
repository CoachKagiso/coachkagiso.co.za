export type SecondaryModelTool = {
  id: string;
  label: string;
  where: string;
};

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
