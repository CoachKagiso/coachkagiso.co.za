import {
  CAROUSEL_SLIDE_ROLE_GLOSSES,
  type CarouselSlideRole,
} from './carousel-template-registry.ts';

/**
 * The carousel-only half of an extracted framework. Absent for a text post or a
 * single screenshot, which have no deck to describe.
 */
export type DeckShape = {
  slideCount?: number;
  slideArc?: string[];
  layoutRecipe?: string;
  copyDensity?: string;
  visualPattern?: string;
  whatMakesItWork?: string;
  hookTechnique?: string;
  intraSlideLoop?: string[];
  pacing?: { sentence?: string; breath?: string; close?: string };
  valueMethod?: string;
  ctaLayers?: string[];
  emotionalArc?: { start?: string; middle?: string; end?: string };
};

/**
 * Renders the deck shape for the Stage 2 rebuild prompt.
 *
 * Stage 1 constrains the arc and recipe to the registry vocabulary precisely so
 * they can be replayed here rather than read and retyped by a human. The arc is
 * written as numbered roles with their glosses so the model reads a shape rather
 * than a list of tokens whose meaning it has to guess.
 *
 * Slide count is passed as the source's count, not as an instruction. The
 * carousel format rules cap a deck at 10 slides while Stage 1 accepts up to 12,
 * so a long source must not silently override the format's own limits.
 *
 * Returns an empty string when there is no deck to describe, so the caller can
 * interpolate it unconditionally.
 */
export function buildDeckShapeSection(framework: DeckShape): string {
  const arc = Array.isArray(framework.slideArc) ? framework.slideArc.filter(Boolean) : [];
  const hasShape = arc.length > 0 || Boolean(framework.slideCount) || Boolean(framework.layoutRecipe);
  if (!hasShape) return '';

  const lines: string[] = [
    'SOURCE DECK SHAPE (structure only - the source deck itself is not available to you):',
  ];

  if (framework.slideCount) {
    lines.push(
      `Source slide count: ${framework.slideCount}. Match this pacing where the format's own slide limits allow.`,
    );
  }
  if (framework.layoutRecipe) {
    lines.push(`Closest layout recipe: ${framework.layoutRecipe}`);
  }
  if (arc.length > 0) {
    lines.push('Slide arc, one role per slide, in order:');
    lines.push(
      arc
        .map((role, index) => {
          const gloss = CAROUSEL_SLIDE_ROLE_GLOSSES[role as CarouselSlideRole];
          return `  ${index + 1}. ${role}${gloss ? ` - ${gloss}` : ''}`;
        })
        .join('\n'),
    );
  }
  if (framework.copyDensity) {
    lines.push(`Copy density on inner slides: ${framework.copyDensity}`);
  }
  if (framework.hookTechnique) {
    lines.push(`Opening technique to reproduce with your own material: ${framework.hookTechnique}`);
  }
  if (framework.intraSlideLoop?.length) {
    lines.push(`Repeat this beat pattern on every inner slide: ${framework.intraSlideLoop.join(' -> ')}`);
  }
  if (framework.pacing?.sentence || framework.pacing?.breath || framework.pacing?.close) {
    lines.push('Pacing rules to hold:');
    if (framework.pacing.sentence) lines.push(`  Sentence: ${framework.pacing.sentence}`);
    if (framework.pacing.breath) lines.push(`  Breath: ${framework.pacing.breath}`);
    if (framework.pacing.close) lines.push(`  Slide close: ${framework.pacing.close}`);
  }
  if (framework.valueMethod) {
    lines.push(`How value is delivered: ${framework.valueMethod}`);
  }
  if (framework.ctaLayers?.length) {
    lines.push('Closing layers, in order:');
    lines.push(framework.ctaLayers.map((layer, index) => `  ${index + 1}. ${layer}`).join('\n'));
  }
  const arcBeats = [framework.emotionalArc?.start, framework.emotionalArc?.middle, framework.emotionalArc?.end].filter(Boolean);
  if (arcBeats.length > 0) {
    lines.push(`Emotional arc to move the reader through: ${arcBeats.join(' -> ')}`);
  }
  if (framework.visualPattern) {
    lines.push(`Visual rhythm: ${framework.visualPattern}`);
  }
  if (framework.whatMakesItWork) {
    lines.push(`Strongest structural choice to preserve: ${framework.whatMakesItWork}`);
  }

  lines.push(
    'If the rebuild is a carousel, follow this arc slide for slide. If it is any other format, use the arc as the order of ideas rather than as slides.',
  );
  lines.push(
    'Everything above describes how the source deck was built. None of it is the source\'s wording, and you have never seen the source. Reproduce the mechanism with Kagiso\'s own material.',
  );

  return `\n${lines.join('\n')}\n`;
}

/**
 * Asks Stage 2 for the reusable fill-in template alongside the finished deck.
 *
 * The template is generated here, not in Stage 1, and that placement is the
 * whole firewall: Stage 1 extracts mechanism and never quotes, so by the time a
 * mould is written the source's sentences are already gone. Punching holes in
 * the source instead would produce a template that reads as the original
 * author's deck with the nouns swapped.
 *
 * Returns an empty string when there is no deck shape, so a text-post rebuild is
 * unaffected.
 */
/**
 * The output contract for a carousel rebuild.
 *
 * This has to sit at the end of the prompt, next to the other output rules.
 * Stated inside the deck-shape block it was ignored - the model had the arc but
 * still wrote one flowing post, because the last word on format said nothing
 * about slides.
 */
export function buildSlideOutputSection(framework: DeckShape): string {
  const arc = Array.isArray(framework.slideArc) ? framework.slideArc.filter(Boolean) : [];
  if (arc.length === 0) return '';

  return `
- WRITE THE DECK AS SLIDES, NOT AS ONE POST. This is the format rule that matters most.
- Head every slide exactly like this, on its own line: SLIDE 1 - ${arc[0]}
- Put that slide's copy on the lines underneath, then one blank line before the next heading.
- Produce exactly ${arc.length} slides, one per role in the arc, in this order: ${arc.map((role, index) => `SLIDE ${index + 1} - ${role}`).join(', ')}
- Do not merge slides, do not renumber them, and do not add a closing summary outside the slides.`;
}

export function buildTemplateRequestSection(framework: DeckShape): string {
  const arc = Array.isArray(framework.slideArc) ? framework.slideArc.filter(Boolean) : [];
  if (arc.length === 0 && !framework.slideCount) return '';

  return `
ALSO RETURN A REUSABLE TEMPLATE:
After the finished piece, add a section headed exactly "--- REUSABLE TEMPLATE ---".
Under it, write the same deck as a blank mould Kagiso can reuse for any future topic.
- One block per slide, headed "SLIDE n - role" using the arc roles above.
- Write the connecting words in Kagiso's voice, and replace every topic-specific noun, example, and claim with a square-bracket placeholder that says what belongs there, for example [THE ADVICE EVERYONE REPEATS] or [YOUR OWN EXAMPLE - 8 WORDS MAX].
- The template must carry no sentence from the finished piece above that names its topic, and no sentence from any source deck.
- Hold the pacing rules and the beat pattern in the template itself, so the shape survives when the brackets are filled.
`;
}
