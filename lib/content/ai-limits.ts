const VIDEO_SCRIPT_CONTENT_TYPES = new Set([
  'short_script',
  'series_part',
  'pov_video',
  'reaction_video',
  'tip_video',
]);

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
