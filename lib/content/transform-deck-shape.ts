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
  if (framework.visualPattern) {
    lines.push(`Visual rhythm: ${framework.visualPattern}`);
  }
  if (framework.whatMakesItWork) {
    lines.push(`Strongest structural choice to preserve: ${framework.whatMakesItWork}`);
  }

  lines.push(
    'If the rebuild is a carousel, follow this arc slide for slide. If it is any other format, use the arc as the order of ideas rather than as slides.',
  );

  return `\n${lines.join('\n')}\n`;
}
