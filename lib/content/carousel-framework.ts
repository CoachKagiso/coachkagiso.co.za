import {
  CAROUSEL_SLIDE_ROLES,
  carouselLayoutRecipeOptions,
} from './carousel-template-registry.ts';

export const CAROUSEL_COPY_DENSITIES = ['light', 'medium', 'dense'] as const;

/** The six fields every source type produces, carousel or not. */
export type BaseFramework = {
  hookPattern: string;
  emotionalTension: string;
  storyStructure: string;
  ctaStyle: string;
  formatLogic: string;
  suggestedPillar: string;
  hasExtractableStructure: boolean;
};

/** How a typical inner slide is built, as an ordered list of beats. */
export type PacingRules = {
  sentence: string;
  breath: string;
  close: string;
};

export type EmotionalArc = {
  start: string;
  middle: string;
  end: string;
};

/** The reusable fill-in mould, one entry per slide, brackets intact. */
export type FrameworkTemplate = {
  headline: string;
  slides: { label: string; content: string }[];
};

export type CarouselFramework = BaseFramework & {
  template: FrameworkTemplate | null;
  slideCount: number;
  slideArc: string[];
  layoutRecipe: string;
  copyDensity: string;
  visualPattern: string;
  whatMakesItWork: string;
  // Mechanism fields. These describe how the deck works rather than what it is
  // about, so they abstract cleanly and never carry source wording.
  hookTechnique: string;
  intraSlideLoop: string[];
  pacing: PacingRules;
  valueMethod: string;
  ctaLayers: string[];
  emotionalArc: EmotionalArc;
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * A list of short strings. Blank entries are dropped and the list is capped, so
 * a model that returns a paragraph per entry cannot blow up the Stage 2 prompt.
 */
function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean).slice(0, max);
}

/**
 * Parses the fill-in mould. Returns null when the model produced nothing usable,
 * so the panel can show an explicit empty state rather than an empty tab.
 */
export function normaliseTemplate(value: unknown): FrameworkTemplate | null {
  const raw = nested(value);
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
  const slides = rawSlides
    .map((entry, index) => {
      const slide = nested(entry);
      return {
        label: text(slide.label) || `Slide ${index + 1}`,
        content: text(slide.content),
      };
    })
    .filter((slide) => slide.content.length > 0)
    .slice(0, 20);

  if (slides.length === 0) return null;
  return { headline: text(raw.headline), slides };
}

function nested(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normaliseFramework(value: Record<string, unknown>): BaseFramework {
  return {
    hookPattern: text(value.hookPattern),
    emotionalTension: text(value.emotionalTension),
    storyStructure: text(value.storyStructure),
    ctaStyle: text(value.ctaStyle),
    formatLogic: text(value.formatLogic),
    suggestedPillar: text(value.suggestedPillar),
    hasExtractableStructure: value.hasExtractableStructure !== false,
  };
}

/**
 * Normalises a carousel extraction into the shape the rest of the app reads.
 *
 * Everything is flat or a small fixed object: the UI rows, the Stage 2 prompt
 * builder and the carousel_dna typed columns all read these names directly, so
 * a nested or renamed shape silently blanks the whole framework.
 */
export function normaliseCarouselFramework(
  value: Record<string, unknown>,
  slideCount: number,
  onUnknownRole?: (role: string) => void,
): CarouselFramework {
  const allowedRoles: Set<string> = new Set(CAROUSEL_SLIDE_ROLES);
  const allowedRecipes: Set<string> = new Set(carouselLayoutRecipeOptions.map((option) => option.value));

  const rawArc = Array.isArray(value.slideArc) ? value.slideArc : [];
  // The arc is positional - entry N describes slide N - so an unrecognised role
  // is coerced to the generic inner role rather than dropped. Dropping used to
  // shorten the array, which silently shifted every later slide's role by one.
  const slideArc = rawArc
    .map((role) => text(role).toLowerCase())
    .map((role) => {
      if (allowedRoles.has(role)) return role;
      onUnknownRole?.(role);
      return 'step';
    })
    .slice(0, slideCount);

  const rawDensity = text(value.copyDensity).toLowerCase();
  const rawRecipe = text(value.layoutRecipe).toLowerCase();
  const pacing = nested(value.pacing);
  const arc = nested(value.emotionalArc);

  return {
    ...normaliseFramework(value),
    template: normaliseTemplate(value.template),
    slideCount,
    slideArc,
    layoutRecipe: allowedRecipes.has(rawRecipe) ? rawRecipe : '',
    copyDensity: (CAROUSEL_COPY_DENSITIES as readonly string[]).includes(rawDensity) ? rawDensity : '',
    visualPattern: text(value.visualPattern),
    whatMakesItWork: text(value.whatMakesItWork),
    hookTechnique: text(value.hookTechnique),
    intraSlideLoop: stringList(value.intraSlideLoop, 8),
    pacing: {
      sentence: text(pacing.sentence),
      breath: text(pacing.breath),
      close: text(pacing.close),
    },
    valueMethod: text(value.valueMethod),
    ctaLayers: stringList(value.ctaLayers, 5),
    emotionalArc: {
      start: text(arc.start),
      middle: text(arc.middle),
      end: text(arc.end),
    },
  };
}
