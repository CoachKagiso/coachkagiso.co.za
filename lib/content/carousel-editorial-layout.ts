import { countWrappedLines, fitTypeSize } from './carousel-type-fit.ts';

/**
 * The Editorial Authority slide, resolved once for every lane that draws it.
 *
 * Three renderers produce this slide: the HTML preview (which html2canvas turns
 * into the PNG), the react-pdf vector document, and Design Studio's canvas.
 * They used to each carry their own numbers, which is how the PNG ended up on
 * 72px side margins while the PDF used 96 - the same deck, two different pages.
 * Everything either lane needs to place a box is computed here instead, in the
 * real output space of a 1080-wide slide, and each lane multiplies by its own
 * width ratio.
 *
 * The other change this encodes: the avatar and handle are part of the centred
 * group, not the pinned header. Only the progress strip, the icon row and the
 * footer are fixed to the edges. As copy grows the group grows around its
 * centre and lifts the avatar, which is what keeps a long slide and a short
 * slide looking like the same design.
 */

/** Everything below is expressed against a 1080px-wide slide. */
export const CAROUSEL_EDITORIAL_BASE_WIDTH = 1080;

/**
 * The wordmark, split where its emphasis falls: light COACH, bold KAGISO.
 *
 * Hardcoded like the handle beside it, and for the same reason - the furniture
 * carries `wordmark: 'COACHKAGISO'` as one string, and there is no rule that
 * splits an arbitrary wordmark at the right place. See the note in
 * EditorialAuthoritySlide about what a skin can and cannot reach here.
 */
export const CAROUSEL_EDITORIAL_WORDMARK = { light: 'COACH', bold: 'KAGISO' } as const;

/**
 * Where each utility mark's ink ends inside lucide's 24-unit grid.
 *
 * They share a grid but do not fill it the same way - the bin runs to 22, the
 * upload arrow to 21, the envelope only to 20 - so a row of equal boxes leaves
 * the glyphs sitting on three different lines. Nudging each viewBox down by the
 * difference lands them on one, and does it without moving the boxes, so the
 * row's height and spacing are untouched.
 *
 * The ellipsis is deliberately absent. A row of dots has no bottom to sit on,
 * and dropped to the others' line it reads as having fallen off it; box-centred
 * is where it belongs.
 */
export const CAROUSEL_ICON_INK_BOTTOM = { mail: 20, trash: 22, upload: 21 } as const;

export type CarouselUtilityIcon = keyof typeof CAROUSEL_ICON_INK_BOTTOM;

/** The line they all sit on: the lowest of them. */
const CAROUSEL_ICON_BASELINE = Math.max(...Object.values(CAROUSEL_ICON_INK_BOTTOM));

/**
 * The viewBox for one utility mark, shifted so its ink ends on the shared line.
 * Same string in both lanes, so the preview and the PDF align identically.
 */
export function editorialIconViewBox(icon: CarouselUtilityIcon): string {
  const drop = CAROUSEL_ICON_BASELINE - CAROUSEL_ICON_INK_BOTTOM[icon];
  return `0 ${-drop} 24 24`;
}

/** The same shift in grid units, for anything positioned against the glyph. */
export function editorialIconDrop(icon: CarouselUtilityIcon): number {
  return CAROUSEL_ICON_BASELINE - CAROUSEL_ICON_INK_BOTTOM[icon];
}

/**
 * Poppins ink extents, in em, read off the shipped TTFs with fontkit.
 *
 * These are what the glyphs actually cover, not what their line boxes reserve.
 * The signature needs them because centring its boxes against the avatar leaves
 * the type looking low: the wordmark is all caps and puts almost nothing below
 * its baseline (0.007em), while the handle hangs the tail of a `g` well under
 * its own (0.272em). Box-centred, ink-heavy at the bottom.
 */
const POPPINS_INK = {
  ascent: 1.05,
  descent: 0.35,
  /** Ink above the baseline for an all-caps run. */
  capRise: 0.706,
  /** Ink below the baseline for the handle, which is the deepest descender. */
  handleDrop: 0.272,
} as const;

/**
 * Which engine is drawing, because the two do not place a baseline the same way.
 */
export type CarouselTextEngine = 'css' | 'pdf';

/**
 * Where a baseline falls inside its line box, measured from the box top.
 *
 * CSS splits the difference between the line box and the font's content box
 * (half-leading) and then drops by the ascent. react-pdf does not: it sets the
 * baseline at the foot of the line box, full stop. Read out of a rendered PDF
 * by walking its transform stack, the gap between them is real and grows with
 * the type - 5.25 at the wordmark, 15.08 at a 52pt headline.
 *
 * Anything aligning ink against something else has to know which engine it is
 * talking to, or the preview and the export disagree by that much.
 */
function baselineOffset(fontSize: number, lineHeight: number, engine: CarouselTextEngine): number {
  if (engine === 'pdf') return fontSize * lineHeight;
  const content = (POPPINS_INK.ascent + POPPINS_INK.descent) * fontSize;
  return (fontSize * lineHeight - content) / 2 + POPPINS_INK.ascent * fontSize;
}

/**
 * How far the name-and-handle block has to rise for its ink, rather than its
 * boxes, to centre on the avatar beside it. One step, derived, no judgement in
 * it. `editorialIdentityLift` is what the renderers actually apply.
 */
export function editorialIdentityOpticalLift(engine: CarouselTextEngine): number {
  const m = carouselEditorialMetrics;
  const nameBaseline = baselineOffset(m.identityFontSize, m.identityLineHeight, engine);
  const handleLineTop = m.identityFontSize * m.identityLineHeight + m.identityLineGap;
  const handleBaseline = handleLineTop + baselineOffset(m.handleFontSize, m.identityLineHeight, engine);

  const inkTop = nameBaseline - POPPINS_INK.capRise * m.identityFontSize;
  const inkBottom = handleBaseline + POPPINS_INK.handleDrop * m.handleFontSize;
  const blockHeight =
    m.identityFontSize * m.identityLineHeight + m.identityLineGap + m.handleFontSize * m.identityLineHeight;

  return Math.round(((inkTop + inkBottom) / 2 - blockHeight / 2) * 100) / 100;
}

/**
 * The lift the renderers apply: the engine's ink correction plus the design
 * offset. The first differs between engines, the second does not, so the ink
 * lands the same distance above the avatar's centre in both.
 *
 * Applied as twice this value of bottom margin, because `align-items: center`
 * centres the margin box - adding it below moves the content up by half of it.
 * Same arithmetic in CSS flexbox and in Yoga, which is what makes the two lanes
 * agree once the baseline difference is accounted for.
 */
export function editorialIdentityLift(engine: CarouselTextEngine): number {
  return (
    Math.round(
      (editorialIdentityOpticalLift(engine) + carouselEditorialMetrics.identityExtraLift) * 100,
    ) / 100
  );
}

export const carouselEditorialMetrics = {
  padX: 96,
  padTop: 108,
  padBottom: 100,

  /** Pinned top band: the progress strip over the utility icons. */
  progressFontSize: 24,
  progressLineHeight: 1.25,
  /**
   * The counter is set in Bebas Neue, which is condensed enough that it needs
   * more air between figures than a Poppins numeral would.
   */
  numeralTracking: 0.1,
  progressGap: 14,
  /** Counter to icon row: clear of each other, still one band. */
  progressRowGap: 40,
  iconSize: 36,

  /** The centred group. */
  avatarSize: 132,
  avatarTextGap: 24,
  identityFontSize: 30,
  /**
   * Set explicitly, and tight.
   *
   * Neither line carried a line height at first, so the preview inherited the
   * app's while react-pdf applied its own default - the same block rendering
   * two shapes, neither of them the reference. Setting the value was not enough
   * on its own either: the lines are now stacked in a flex column with an
   * explicit gap, so the space between them is one number rather than the sum
   * of two line boxes and whatever leading is in scope.
   */
  identityLineHeight: 1.05,
  identityLineGap: 4,
  /** The handle sets a step larger than the wordmark above it. */
  handleFontSize: 32,
  /**
   * How far above the avatar's centre the signature's ink should finally sit.
   *
   * Separate from, and added to, the correction that centres it - and an
   * absolute distance rather than a multiple of that correction. It was a
   * multiplier first, which quietly made the offset engine-dependent: the
   * correction is 4.09 under CSS and 9.51 under react-pdf, so doubling it put
   * the preview 4pt above centre and the PDF 9pt above. A design offset is a
   * distance somebody chose. It is the same distance in both.
   */
  identityExtraLift: 4,
  /**
   * The wordmark is one word set in two weights. Rendering it at a single
   * weight loses the emphasis the mark is built on.
   */
  wordmarkLightWeight: 400,
  wordmarkBoldWeight: 700,
  /** Avatar row to headline. Measured off the reference card. */
  groupGap: 56,
  /** Headline to body. */
  bodyGap: 28,

  /**
   * The headline sets at `headlineMax` and only comes down when the copy stops
   * fitting. It deliberately does not grow to fill the band: the reference card
   * leaves real air under the type, and a deck whose headline size tracked the
   * free space would change size on every slide.
   */
  headlineMin: 30,
  headlineMax: 52,
  /** Covers carry the hook, so they are allowed a step up. */
  coverHeadlineMax: 64,
  headlineLineHeight: 1.28,

  bodyMin: 23,
  bodyMax: 34,
  bodyLineHeight: 1.5,

  /** Pinned footer: wordmark left, swipe cue right. */
  footerFontSize: 23,
  footerLineHeight: 1.2,
  swipeIconSize: 36,

  /** The body never takes more than this share of the free band. */
  bodyShare: 0.34,
} as const;

/**
 * Every measurement here is in base space - the 1080-wide slide - and the
 * caller multiplies by `scale`. Returning base-space numbers rather than
 * pre-scaled ones is deliberate: the PDF lane renders at 1080 (scale 1) while
 * the preview renders at 600, and a pre-scaled value passed through a second
 * scaling step is a bug that looks like a design decision.
 */
export type CarouselEditorialLayout = {
  /** Multiply every number below by this to render at the target width. */
  scale: number;
  contentWidth: number;
  padX: number;
  padTop: number;
  padBottom: number;
  topBandHeight: number;
  footerHeight: number;
  /** Height the centred group may occupy. */
  bandHeight: number;
  avatarRowHeight: number;
  headlineSize: number;
  headlineLines: number;
  headlineHeight: number;
  bodySize: number;
  bodyLines: number;
  bodyHeight: number;
  /**
   * The body's rows, exactly as typed, blank ones included. Split here rather
   * than in each renderer so a lane cannot draw a shape the fit did not
   * measure. `bodyLines` above is the count after wrapping; this is the source.
   */
  bodyRows: string[];
  groupHeight: number;
  /** True when the copy still does not fit at the smallest size we will set. */
  overflows: boolean;
};

export type CarouselEditorialInput = {
  headline: string;
  body?: string | null;
  /** Cover slides set their headline a step larger. */
  isCover?: boolean;
  /** Rendered slide width, e.g. 1080 for export or 600 for the preview. */
  width: number;
  /** Rendered slide height, e.g. 1350 for 4:5 or 1080 for square. */
  height: number;
};

/**
 * Resolves one slide.
 *
 * The body is fitted first, against a capped share of the band, so that a long
 * body cannot squeeze the headline down to nothing. Whatever it does not use
 * goes back to the headline, which is the line the reader actually stops for.
 */
export function layoutEditorialAuthoritySlide(input: CarouselEditorialInput): CarouselEditorialLayout {
  const m = carouselEditorialMetrics;
  const scale = input.width / CAROUSEL_EDITORIAL_BASE_WIDTH;
  // Work in base space throughout, then scale once on the way out.
  const pageHeight = input.height / scale;
  const contentWidth = CAROUSEL_EDITORIAL_BASE_WIDTH - m.padX * 2;

  const topBandHeight =
    m.progressFontSize * m.progressLineHeight + m.progressRowGap + m.iconSize;
  // The footer row is as tall as its tallest item, which is the swipe hand
  // rather than the wordmark beside it.
  const footerHeight = Math.max(m.footerFontSize * m.footerLineHeight, m.swipeIconSize);
  const bandHeight = Math.max(
    0,
    pageHeight - m.padTop - topBandHeight - m.padBottom - footerHeight,
  );

  const avatarRowHeight = Math.max(
    m.avatarSize,
    (m.identityFontSize + m.handleFontSize) * m.identityLineHeight + m.identityLineGap,
  );

  const body = String(input.body || '').trim();
  const headline = String(input.headline || '').trim();
  const headlineMax = input.isCover ? m.coverHeadlineMax : m.headlineMax;

  /**
   * The body exactly as it was typed: one entry per line, blank lines included.
   *
   * It used to split on runs of newlines and drop the empties, which made
   * `a

b` and `a
b` the same slide - so deleting the blank line between two
   * lines changed nothing on the rendered side, and there was no way to tell
   * from the preview what the copy actually said. Every line is kept now,
   * including the empty ones, and an empty line occupies a line.
   *
   * That also retires the invented gap between items. The author's own blank
   * line is the separation; adding more on top of it was this layout guessing
   * at spacing the copy already expressed.
   */
  const bodyRows = body.length
    ? body.split(String.fromCharCode(10)).map((line) => line.trimEnd())
    : [];

  /** Wrapped line count for the body as it will actually be drawn. */
  const bodyLinesAt = (size: number) =>
    bodyRows.reduce(
      // An empty line still takes a line.
      (total, line) => total + (line ? countWrappedLines(line, size, contentWidth, 'poppins') : 1),
      0,
    );

  const bodyHeightAt = (size: number, lines: number) => lines * size * m.bodyLineHeight;

  const fitBody = (budget: number) => {
    if (!body) return { size: 0, lines: 0, height: 0 };
    let size = m.bodyMin;
    for (let candidate = m.bodyMax; candidate > m.bodyMin; candidate -= 0.5) {
      if (bodyHeightAt(candidate, bodyLinesAt(candidate)) <= budget) {
        size = Math.round(candidate * 100) / 100;
        break;
      }
    }
    const lines = bodyLinesAt(size);
    return { size, lines, height: bodyHeightAt(size, lines) };
  };

  const fitHeadline = (budget: number) => {
    const size = fitTypeSize({
      text: headline,
      maxWidth: contentWidth,
      maxHeight: budget,
      lineHeight: m.headlineLineHeight,
      typeface: 'poppins',
      min: m.headlineMin,
      max: headlineMax,
    });
    const lines = countWrappedLines(headline, size, contentWidth, 'poppins');
    return { size, lines, height: lines * size * m.headlineLineHeight };
  };

  // The body starts on a capped share of the band so that a long body cannot
  // shrink the headline - the line the reader stops for - down to nothing. If
  // the two together still overrun, the passes below hand the body only the
  // space the headline did not take. Two extra passes is enough to settle and
  // keeps the whole thing deterministic, which matters more here than being
  // optimal: three lanes have to reach the same answer.
  let bodyBudget = body ? bandHeight * m.bodyShare : 0;
  let fittedBody = fitBody(bodyBudget);
  let fittedHeadline = fitHeadline(
    Math.max(
      m.headlineMin * m.headlineLineHeight,
      bandHeight - avatarRowHeight - m.groupGap - (body ? m.bodyGap + fittedBody.height : 0),
    ),
  );

  for (let pass = 0; body && pass < 2; pass += 1) {
    const spare =
      bandHeight - avatarRowHeight - m.groupGap - fittedHeadline.height - m.bodyGap;
    if (fittedBody.height <= spare) break;
    bodyBudget = Math.max(m.bodyMin * m.bodyLineHeight, spare);
    fittedBody = fitBody(bodyBudget);
    fittedHeadline = fitHeadline(
      Math.max(
        m.headlineMin * m.headlineLineHeight,
        bandHeight - avatarRowHeight - m.groupGap - m.bodyGap - fittedBody.height,
      ),
    );
  }

  const bodySize = fittedBody.size;
  const bodyLines = fittedBody.lines;
  const bodyHeight = fittedBody.height;
  const headlineSize = fittedHeadline.size;
  const headlineLines = fittedHeadline.lines;
  const headlineHeight = fittedHeadline.height;

  const groupHeight =
    avatarRowHeight + m.groupGap + headlineHeight + (body ? m.bodyGap + bodyHeight : 0);

  // Overflow is one question - does the finished group fit between the pinned
  // rows - rather than a per-element check, because a body that used more than
  // its share is not a problem when there was room for it.
  const overflows = groupHeight > bandHeight;

  return {
    scale,
    contentWidth,
    padX: m.padX,
    padTop: m.padTop,
    padBottom: m.padBottom,
    topBandHeight,
    footerHeight,
    bandHeight,
    avatarRowHeight,
    headlineSize,
    headlineLines,
    headlineHeight,
    bodySize,
    bodyLines,
    bodyHeight,
    bodyRows,
    groupHeight,
    overflows,
  };
}
