/**
 * Stage 2 returns the finished piece and, for a carousel source, a reusable
 * mould after a marker heading. The two are split here so the post can be shown
 * in Transform while the template is filed in the Vault, which is the only place
 * templates are kept.
 */

export const REBUILD_TEMPLATE_HEADING = '--- REUSABLE TEMPLATE ---';

export type TemplateSlide = {
  label: string;
  content: string;
};

export type CarouselTemplateRecord = {
  heading: string;
  slides: TemplateSlide[];
  raw: string;
};

/** Tolerates the model varying the dashes or dropping them entirely. */
const HEADING_PATTERN = /^\s*-{0,4}\s*REUSABLE TEMPLATE\s*-{0,4}\s*$/im;

export function splitRebuildOutput(raw: string): { post: string; template: string } {
  const text = String(raw ?? '');
  const match = HEADING_PATTERN.exec(text);
  if (!match || match.index === undefined) {
    return { post: text.trim(), template: '' };
  }
  return {
    post: text.slice(0, match.index).trim(),
    template: text.slice(match.index + match[0].length).trim(),
  };
}

/**
 * Splits a template into per-slide blocks. Slide headings look like
 * "SLIDE 3 - step". Anything before the first heading is kept as a preamble
 * slide so nothing the model wrote is silently discarded.
 */
export function parseTemplateSlides(template: string): TemplateSlide[] {
  const text = String(template ?? '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const slides: TemplateSlide[] = [];
  let current: TemplateSlide | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    const heading = /^\s*#{0,3}\s*\**\s*(SLIDE\s+\d+[^*\n]*?)\s*\**\s*:?\s*$/i.exec(line);
    if (heading) {
      if (current) slides.push({ ...current, content: current.content.trim() });
      current = { label: heading[1].trim(), content: '' };
      continue;
    }
    if (current) current.content += `${line}\n`;
    else preamble.push(line);
  }
  if (current) slides.push({ ...current, content: current.content.trim() });

  const lead = preamble.join('\n').trim();
  if (lead && slides.length === 0) return [{ label: 'Template', content: lead }];
  return slides;
}

/**
 * Splits a rebuilt deck into whatever precedes the first slide (the PLATFORM /
 * PILLAR / REGISTER header) and the slides themselves, so the slides can be
 * edited as a list and written back without losing that header.
 */
export function splitSlidePreamble(text: string): { preamble: string; slides: TemplateSlide[] } {
  const source = String(text ?? '');
  const match = /^\s*#{0,3}\s*\**\s*SLIDE\s+\d+/im.exec(source);
  if (!match || match.index === undefined) return { preamble: source.trim(), slides: [] };
  return {
    preamble: source.slice(0, match.index).trim(),
    slides: parseTemplateSlides(source.slice(match.index)),
  };
}

export function serialiseSlides(slides: TemplateSlide[]): string {
  return slides.map((slide) => `${slide.label}\n${slide.content}`.trim()).join('\n\n');
}

/** Rebuilds the full output text from an edited slide list, header intact. */
export function replaceSlidesInOutput(output: string, slides: TemplateSlide[]): string {
  const { preamble } = splitSlidePreamble(output);
  const body = serialiseSlides(slides);
  return preamble ? `${preamble}\n\n${body}` : body;
}

export function normaliseTemplate(raw: string): CarouselTemplateRecord | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const slides = parseTemplateSlides(text);
  if (slides.length === 0) return null;
  return { heading: 'Reusable template', slides, raw: text };
}

/** Counts the [BRACKET] placeholders, which is what makes a mould reusable. */
export function countPlaceholders(template: string): number {
  const matches = String(template ?? '').match(/\[[^\]\n]{2,80}\]/g);
  return matches ? matches.length : 0;
}

/**
 * The instruction that turns a stored mould back into a finished deck.
 *
 * The template already carries Kagiso's voice and the source deck's mechanism,
 * so this only has to supply a topic and insist every placeholder is replaced.
 */
export function buildTemplateFillPrompt(options: {
  template: string;
  topic: string;
  label?: string | null;
  pillar?: string | null;
  slideArc?: string[];
}): string {
  const { template, topic, label, pillar, slideArc } = options;
  const arcNote = slideArc?.length
    ? `\nSlide roles, in order: ${slideArc.join(' -> ')}. Keep one slide per role.`
    : '';
  const pillarNote = pillar ? `\nPillar: ${pillar}` : '';

  return `Fill in this saved carousel template for a new topic.

TEMPLATE${label ? ` (${label})` : ''}:
${template}

TOPIC: ${topic}${pillarNote}${arcNote}

RULES:
- Replace EVERY [BRACKET] with real content. No bracket may remain in your output.
- Keep the slide count, the order, and the pacing the template sets.
- Keep the sentence rhythm the template models. Do not pad slides with extra prose.
- Use Kagiso's voice and her South African audience.
- Return the carousel as structured JSON in the carousel draft format you were given in your instructions.`;
}
