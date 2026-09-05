/**
 * What the vector PDF lane can and cannot draw, and how it says so.
 *
 * Design Studio exports a PDF two ways. The vector lane redraws the layer model
 * as real PDF objects - sharp at any zoom - and the raster lane photographs the
 * preview with html2canvas. The vector lane is better whenever it can draw the
 * design faithfully, and worse than useless when it cannot, because a
 * substituted font or a dropped effect is not visible until someone opens the
 * file. This module is the judgement between the two.
 *
 * It lives apart from the renderer so the policy can be tested without a
 * browser, and so the font tables have exactly one home: the list a family must
 * appear in to be embeddable is the same list the renderer registers from.
 */

/** Brand faces available as OTF/TTF, so embeddable in a PDF. */
export const EMBEDDABLE_BRAND_FONTS: Record<string, string> = {
  // Converted from the shipped woff2 with wawoff2; the source is CFF, so it
  // decompresses straight to a .otf React PDF can embed.
  daughterHand: '/fonts/brand/daughter-hand.otf',
  linebrush: '/fonts/brand/linebrush.otf',
  mibrush: '/fonts/brand/mibrush-regular.otf',
  simpleNotes: '/fonts/brand/simple-notes-regular.otf',
  walesiaSignatureBrush: '/fonts/brand/walesia-signature-brush.otf',
  walkingDream: '/fonts/brand/walking-dream.otf',
};

/** The body families, keyed by the layer's own `fontFamily` value. */
export const CORE_PDF_FONT_FAMILIES: Record<string, string> = {
  serif: 'Playfair Display',
  sans: 'Inter',
  interTight: 'Inter',
  poppins: 'Poppins',
};

/**
 * The families registered at more than one weight. Everything else is a single
 * face, so asking one for bold hands back the regular without complaint.
 */
export const MULTI_WEIGHT_PDF_FONTS = new Set(['Inter', 'Playfair Display', 'Poppins']);

/**
 * The families with real italic files behind them.
 *
 * Everywhere else italic is the browser slanting an upright face, and there is
 * nothing to embed - which is why italic used to block the vector lane
 * outright. Poppins is the exception: it ships Italic and BoldItalic, already
 * self-hosted for the carousel. So the question is per family, not global, and
 * a Poppins design may use italic and still export as vector.
 *
 * A family must never be asked for a style it was not registered at - React PDF
 * throws on an unresolved face and takes the whole document with it.
 */
export const ITALIC_CAPABLE_PDF_FONTS = new Set(['Poppins']);

export function pdfFontHasItalic(family: string) {
  return ITALIC_CAPABLE_PDF_FONTS.has(mapPdfFontFamily(family));
}

/** What a design asks of the vector lane, for the blocker to judge. */
export type DesignVectorFeatureReport = {
  fontFamilies: string[];
  /** Families asked for a weight they were not registered at. */
  syntheticBoldFamilies: string[];
  /** Families asked for italic. Only some have a drawn italic to embed. */
  italicFamilies: string[];
  /** Drop shadow, outline and blur are all CSS filters; a PDF has no filters. */
  usesLayerEffects: boolean;
};

export function emptyVectorFeatureReport(): DesignVectorFeatureReport {
  return { fontFamilies: [], syntheticBoldFamilies: [], italicFamilies: [], usesLayerEffects: false };
}

export function mapPdfFontFamily(family?: string) {
  if (!family) return 'Inter';
  if (CORE_PDF_FONT_FAMILIES[family]) return CORE_PDF_FONT_FAMILIES[family];
  if (EMBEDDABLE_BRAND_FONTS[family]) return family;
  return 'Inter';
}

/** Inter and Playfair are registered per weight; brand faces have one weight. */
export function mapPdfFontWeight(family: string, weight?: number) {
  if (!MULTI_WEIGHT_PDF_FONTS.has(family)) return undefined;
  const requested = weight || 400;
  if (family === 'Playfair Display') {
    if (requested >= 700) return 700;
    return requested >= 600 ? 600 : 500;
  }
  if (requested >= 700) return 700;
  if (requested >= 600) return 600;
  if (requested >= 500) return 500;
  return 400;
}

function describeList(values: string[]) {
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

/**
 * A human-readable reason the design cannot be drawn as vector, or null when it
 * can. Checked before rendering so the caller falls back cleanly rather than
 * producing a PDF that quietly differs from the preview.
 *
 * Fonts are default-deny. The old check named the faces it knew were
 * unembeddable, which meant a family nobody had thought about passed - Sweet
 * Bulky is loaded from a CDN and has no file on disk at all, so every design
 * using it exported silently set in Inter. Anything not in the tables above is
 * now a blocker by construction, and adding a font to the studio without a file
 * fails loudly instead of quietly.
 */
export function getVectorExportBlocker(report: DesignVectorFeatureReport | string[]): string | null {
  const normalized: DesignVectorFeatureReport = Array.isArray(report)
    ? { ...emptyVectorFeatureReport(), fontFamilies: report }
    : report;

  const reasons: string[] = [];

  const unembeddable = [...new Set(normalized.fontFamilies)].filter(
    (family) => !CORE_PDF_FONT_FAMILIES[family] && !EMBEDDABLE_BRAND_FONTS[family],
  );
  if (unembeddable.length) {
    reasons.push(
      `${describeList(unembeddable)} ${unembeddable.length === 1 ? 'has' : 'have'} no font file this export can embed`,
    );
  }

  // Only worth reporting for faces that are otherwise fine: an unembeddable
  // family is already named above, and saying it twice helps nobody.
  const syntheticBold = [...new Set(normalized.syntheticBoldFamilies)].filter(
    (family) => Boolean(EMBEDDABLE_BRAND_FONTS[family]),
  );
  if (syntheticBold.length) {
    reasons.push(`${describeList(syntheticBold)} ${syntheticBold.length === 1 ? 'has' : 'have'} no bold weight`);
  }

  // Only the families that have no drawn italic. Poppins does, so a Poppins
  // design in italic is no reason to fall back.
  const syntheticItalic = [...new Set(normalized.italicFamilies)].filter(
    (family) => !pdfFontHasItalic(family) && (CORE_PDF_FONT_FAMILIES[family] || EMBEDDABLE_BRAND_FONTS[family]),
  );
  if (syntheticItalic.length) {
    reasons.push(
      `${describeList(syntheticItalic)} ${syntheticItalic.length === 1 ? 'has' : 'have'} no italic font file, only a slanted regular`,
    );
  }

  // Layer effects are deliberately not a blocker. They are a real difference
  // from the canvas, but falling back would not fix it: html2canvas 1.4.1 does
  // not implement CSS `filter` either, so a shadow, outline or blur is absent
  // from the raster export too. Sending a design to the slower, softer lane to
  // lose the same thing helps nobody - `getExportFidelityNotice` says it out
  // loud instead, on whichever lane runs.
  return reasons.length ? reasons.join('; ') : null;
}

/**
 * What the finished export will not carry, whichever lane produced it.
 *
 * Everything here is a limit of the tools underneath rather than a choice, so
 * the honest thing is to name it on the export itself. A drop shadow that is
 * on the canvas and missing from the downloaded file is exactly the kind of
 * difference nobody notices until the post is already up.
 */
export function getExportFidelityNotice(report: DesignVectorFeatureReport): string | null {
  if (!report.usesLayerEffects) return null;
  return 'Layer shadows, outlines and blur are not carried into exported files.';
}
