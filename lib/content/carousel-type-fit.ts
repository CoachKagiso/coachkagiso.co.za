import {
  CAROUSEL_GLYPH_FALLBACK,
  CAROUSEL_GLYPH_WIDTHS,
  type CarouselTypeFace,
} from './carousel-type-metrics.ts';

/**
 * Continuous type fitting for carousel slides.
 *
 * The old sizing was a step function over word count - "more than nine words?
 * drop from 46 to 40" - which left short copy floating in dead space, crowded
 * long copy, and could only warn about overflow with an amber badge instead of
 * preventing it.
 *
 * This measures instead. Not with a DOM: the react-pdf lane renders on the
 * server where there is nothing to measure in, and Design Studio imports the
 * same deck again. All three lanes have to arrive at the same number or a deck
 * looks like three different decks, so the fit is arithmetic over real advance
 * widths read from the shipped TTFs (see carousel-type-metrics.ts).
 *
 * Everything here works in em, so a caller passes widths and heights already
 * divided by nothing in particular - the numbers just have to share a unit.
 */

export type CarouselFitTypeface = 'poppins' | 'inter';

type Run = { text: string; bold: boolean };

// Written as codes because these two characters do not survive every editing
// path intact, and a stray literal newline here silently breaks the parser.
const NEWLINE = String.fromCharCode(10);
const TAB = String.fromCharCode(9);

/**
 * Splits `**key phrase**` markers into runs.
 *
 * Both renderers already turn these into strong spans, so a fit that ignored
 * them would under-measure every headline that uses one - and the reference
 * look is built on bolded key phrases.
 */
export function splitBoldRuns(text: string): Run[] {
  const parts = String(text ?? '').split(/\*\*(.+?)\*\*/g);
  const runs: Run[] = [];
  parts.forEach((part, index) => {
    if (part) runs.push({ text: part, bold: index % 2 === 1 });
  });
  return runs;
}

function faceKey(typeface: CarouselFitTypeface, bold: boolean): CarouselTypeFace {
  return `${typeface}${bold ? 700 : 400}` as CarouselTypeFace;
}

/** Width of one character in em. Unmapped characters take the mean lowercase width. */
function charWidth(char: string, face: CarouselTypeFace): number {
  const width = CAROUSEL_GLYPH_WIDTHS[face][char];
  return typeof width === 'number' ? width : CAROUSEL_GLYPH_FALLBACK[face];
}

/** Width of a string in em, with no wrapping. */
export function measureEm(text: string, typeface: CarouselFitTypeface, bold = false): number {
  const face = faceKey(typeface, bold);
  let total = 0;
  for (const char of text) total += charWidth(char, face);
  return total;
}

type Token = { text: string; em: number; breakBefore: boolean };

/**
 * Words, each carrying its own width, with the author's newlines kept as hard
 * breaks.
 *
 * Walks character by character rather than splitting each run separately,
 * because a single word can span a style boundary - "cer" plus a bolded
 * "tainty" is one word and must wrap as one.
 */
function tokenise(runs: Run[], typeface: CarouselFitTypeface): Token[] {
  const tokens: Token[] = [];
  let em = 0;
  let text = '';
  let pendingBreak = false;

  const flush = () => {
    if (!text) return;
    tokens.push({ text, em, breakBefore: pendingBreak });
    pendingBreak = false;
    text = '';
    em = 0;
  };

  for (const run of runs) {
    const face = faceKey(typeface, run.bold);
    for (const char of run.text) {
      if (char === NEWLINE) {
        flush();
        pendingBreak = true;
        continue;
      }
      if (char === ' ' || char === TAB) {
        flush();
        continue;
      }
      text += char;
      em += charWidth(char, face);
    }
  }
  flush();

  return tokens;
}

/**
 * Number of lines the text occupies at this size, wrapping greedily the way
 * both renderers do.
 */
export function countWrappedLines(
  text: string,
  fontSize: number,
  maxWidth: number,
  typeface: CarouselFitTypeface,
): number {
  const tokens = tokenise(splitBoldRuns(text), typeface);
  if (!tokens.length) return 0;

  const spaceEm = measureEm(' ', typeface);
  const maxEm = maxWidth / fontSize;
  let lines = 1;
  let used = 0;

  for (const token of tokens) {
    if (token.breakBefore) {
      lines += 1;
      used = token.em;
      continue;
    }
    if (used === 0) {
      used = token.em;
      continue;
    }
    const next = used + spaceEm + token.em;
    if (next > maxEm) {
      lines += 1;
      used = token.em;
    } else {
      used = next;
    }
  }

  return lines;
}

export type CarouselFitOptions = {
  text: string;
  /** Usable width, in the same unit as the returned size. */
  maxWidth: number;
  /** Usable height, in the same unit as the returned size. */
  maxHeight: number;
  lineHeight: number;
  typeface: CarouselFitTypeface;
  min: number;
  max: number;
  /** Search granularity. Half a point is finer than any lane can render. */
  step?: number;
};

/**
 * The largest size at or below `max` whose wrapped block fits `maxHeight`,
 * never going below `min`.
 *
 * Returning `min` rather than something smaller is deliberate: past a point,
 * shrinking type to fit is the wrong fix and the copy needs cutting. The
 * renderer keeps its overflow badge for that case.
 */
export function fitTypeSize(options: CarouselFitOptions): number {
  const { text, maxWidth, maxHeight, lineHeight, typeface, min, max } = options;
  const step = options.step ?? 0.5;
  if (!String(text || '').trim()) return max;

  for (let size = max; size > min; size -= step) {
    const lines = countWrappedLines(text, size, maxWidth, typeface);
    if (lines * size * lineHeight <= maxHeight) return Math.round(size * 100) / 100;
  }
  return min;
}
