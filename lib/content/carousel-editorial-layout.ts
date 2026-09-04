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
  /** Counter to icon row. Wide on purpose: they are two separate marks. */
  progressRowGap: 64,
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
   * The wordmark is one word set in two weights. Rendering it at a single
   * weight loses the emphasis the mark is built on.
   */
  wordmarkLightWeight: 400,
  wordmarkBoldWeight: 700,
  /** Avatar row to headline. Measured off the reference card. */
  groupGap: 76,
  /** Headline to body. */
  bodyGap: 28,
  /**
   * Between list lines. Without it a wrapped item runs straight into the next
   * one and three points read as one paragraph, which is the failure mode of
   * setting a list as plain type instead of cards.
   */
  bodyItemGap: 16,

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
  footerFontSize: 26,
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
   * The body split into points, and whether it should be set as separate lines.
   *
   * Decided here rather than in each renderer because the answer changes the
   * height - a list carries a gap between its items - and a lane that decided
   * for itself could draw a list the fit had measured as a paragraph.
   */
  bodyPoints: string[];
  bodyAsList: boolean;
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

  // A list is what the author wrote on separate lines - nothing else.
  //
  // The registry's `getCarouselSlideBodyPoints` also splits on sentence ends
  // and caps the result, which is right for a card grid and wrong here: it
  // turns an ordinary three-sentence paragraph into a list, and it drops
  // anything past the cap. Copy that reaches an exported slide must never be
  // silently shortened by a layout decision.
  const bodyPoints = body
    .split(new RegExp(String.fromCharCode(10) + '+'))
    .map((point) => point.trim())
    .filter(Boolean);
  const bodyAsList = bodyPoints.length > 1;

  /** Wrapped line count for the body as it will actually be drawn. */
  const bodyLinesAt = (size: number) =>
    bodyAsList
      ? bodyPoints.reduce((total, point) => total + countWrappedLines(point, size, contentWidth, 'poppins'), 0)
      : countWrappedLines(body, size, contentWidth, 'poppins');

  const bodyHeightAt = (size: number, lines: number) =>
    lines * size * m.bodyLineHeight + (bodyAsList ? (bodyPoints.length - 1) * m.bodyItemGap : 0);

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
    bodyPoints,
    bodyAsList,
    groupHeight,
    overflows,
  };
}
