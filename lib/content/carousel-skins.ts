import {
  CUSTOM_TEMPLATE_PREFIX,
  carouselTemplateOptions,
  getCarouselTemplateOption,
  type CarouselTemplate,
  type CarouselTemplateOption,
} from './carousel-template-registry.ts';

/**
 * A custom skin is a look laid over a built-in template: a palette and the
 * furniture around it. Everything that decides behaviour - the slide layout, the
 * layout recipe, the generation prompts - keeps coming from the base.
 *
 * That is deliberate. Both renderers, the HTML preview and the react-pdf
 * document, draw their own layout from these tokens. A skin expressed this way
 * therefore works identically in preview, PNG and vector PDF, which a freeform
 * design could not.
 */
export type CarouselSkin = {
  id: string;
  name: string;
  baseTemplate: string;
  palette: Partial<CarouselTemplateOption['palette']>;
  furniture: Partial<CarouselTemplateOption['furniture']>;
  createdAt: string;
  updatedAt: string;
};

export type CarouselSkinInput = {
  name: string;
  baseTemplate: string;
  palette: Record<string, unknown>;
  furniture: Record<string, unknown>;
};

/** Custom skins carry this prefix so a stored value can never collide with a built-in. */
export const CUSTOM_SKIN_PREFIX = CUSTOM_TEMPLATE_PREFIX;

export function isCustomSkinValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(CUSTOM_SKIN_PREFIX);
}

export function customSkinId(value: string): string {
  return value.slice(CUSTOM_SKIN_PREFIX.length);
}

const paletteKeys = [
  'background',
  'foreground',
  'muted',
  'accent',
  'panel',
  'border',
  'chipBackground',
  'chipText',
] as const;

/** Only the eight palette slots and string furniture values survive, so a bad row cannot inject arbitrary style. */
export function sanitisePalette(value: unknown): Partial<CarouselTemplateOption['palette']> {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const key of paletteKeys) {
    const entry = raw[key];
    if (typeof entry === 'string' && entry.trim()) out[key] = entry.trim();
  }
  return out as Partial<CarouselTemplateOption['palette']>;
}

export function sanitiseFurniture(value: unknown): Partial<CarouselTemplateOption['furniture']> {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      out[key] = entry;
    }
  }
  return out as Partial<CarouselTemplateOption['furniture']>;
}

/**
 * Produces the option the renderers consume. The base supplies everything the
 * skin does not override, so a skin is never missing a field a renderer expects.
 */
export function resolveSkinOption(skin: CarouselSkin): CarouselTemplateOption {
  const base = getCarouselTemplateOption(skin.baseTemplate as CarouselTemplate);
  return {
    ...base,
    value: `${CUSTOM_SKIN_PREFIX}${skin.id}` as CarouselTemplate,
    label: skin.name,
    bestFor: base.bestFor,
    description: `Your own skin, built on ${base.label}.`,
    palette: { ...base.palette, ...skin.palette },
    furniture: { ...base.furniture, ...skin.furniture },
  };
}

/**
 * Resolves any template value - built-in or custom - to a renderable option.
 * A custom skin that has been deleted falls back to its base rather than
 * throwing, so an old draft still opens.
 */
export function resolveTemplateOption(
  value: string | null | undefined,
  skins: CarouselSkin[],
): CarouselTemplateOption {
  if (isCustomSkinValue(value)) {
    const skin = skins.find((entry) => entry.id === customSkinId(value));
    if (skin) return resolveSkinOption(skin);
  }
  return getCarouselTemplateOption(value as CarouselTemplate);
}

/** The picker list: built-ins first, then anything the user has made. */
export function listTemplateOptions(skins: CarouselSkin[]): CarouselTemplateOption[] {
  return [...carouselTemplateOptions, ...skins.map(resolveSkinOption)];
}
