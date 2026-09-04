const VIDEO_SCRIPT_CONTENT_TYPES = new Set([
  'short_script',
  'series_part',
  'pov_video',
  'reaction_video',
  'tip_video',
]);

/**
 * Sampling temperature per writing register. Lower is steadier: conviction and
 * pastoral registers wander off-voice when hot, while tactical and celebratory
 * registers benefit from a little more variation. Unknown registers keep the
 * historic 0.7 default. Single source of truth - the route resolves it, the UI
 * only sends which register was selected.
 */
const TEMPERATURE_BY_REGISTER: Record<string, number> = {
  conviction_reframe: 0.45,
  reflection_friday: 0.45,
  reflective_leader: 0.6,
  the_challenger: 0.6,
  challenger: 0.6,
  tactical_teacher: 0.65,
  celebration_gratitude: 0.65,
};

export const DEFAULT_CONTENT_TEMPERATURE = 0.7;

export function resolveTemperatureForRegister(register: unknown): number {
  if (typeof register === 'string') {
    const hit = TEMPERATURE_BY_REGISTER[register.trim().toLowerCase()];
    if (typeof hit === 'number') return hit;
  }
  return DEFAULT_CONTENT_TEMPERATURE;
}

export function getContentAiMaxTokens(mode: string, contentType?: string, angle?: string) {
  if (mode === 'calendar_plan') return 2400;
  if (mode === 'summarise_insights') return 900;
  if (mode === 'write_post' && contentType === 'carousel') return 2600;
  if (mode === 'write_post' && angle === 'manifesto_series') return 3200;
  if (mode === 'image_prompts') return 2200;
  if (mode === 'write_post' && contentType === 'caption_reel') return 2200;
  if (mode === 'write_post' && VIDEO_SCRIPT_CONTENT_TYPES.has(contentType || '')) return 3200;
  if (mode === 'write_post' || mode === 'voice_note' || mode === 'alchemy_stage2') return 1800;
  if (mode === 'hook_generator') return 1700;
  if (mode === 'cta_generator') return 1100;
  if (mode === 'alchemy_critique') return 600;
  return 1200;
}
