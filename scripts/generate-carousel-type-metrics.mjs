/**
 * Regenerates lib/content/carousel-type-metrics.ts from the shipped TTFs.
 *
 * The carousel draws the same slide in three lanes: the HTML preview (which
 * html2canvas rasterises into the PNG), the react-pdf vector document, and
 * Design Studio's canvas. Only one of those can measure text - the PDF lane
 * renders on the server with no DOM. So the type fit has to be arithmetic that
 * runs identically everywhere, and arithmetic needs real advance widths rather
 * than a guessed average.
 *
 * Run: node scripts/generate-carousel-type-metrics.mjs
 */
import { openSync } from 'fontkit';
import { writeFileSync } from 'node:fs';

const FACES = [
  { key: 'poppins400', file: 'public/fonts/Poppins-Regular.ttf' },
  { key: 'poppins700', file: 'public/fonts/Poppins-Bold.ttf' },
  { key: 'inter400', file: 'public/fonts/Inter-Regular.ttf' },
  { key: 'inter700', file: 'public/fonts/Inter-Bold.ttf' },
];

// Printable ASCII plus the punctuation the generator actually emits.
const CHARS = [];
for (let code = 32; code <= 126; code += 1) CHARS.push(String.fromCharCode(code));
for (const extra of ['\u2013', '\u2014', '\u2018', '\u2019', '\u201C', '\u201D', '\u2026']) CHARS.push(extra);

function widthsFor(file) {
  const font = openSync(file);
  const em = font.unitsPerEm;
  const out = {};
  for (const char of CHARS) {
    // layout() rather than glyphForCodePoint().advanceWidth so kerning and
    // shaping features are included, which is what the renderer will apply.
    out[char] = Math.round((font.layout(char).advanceWidth / em) * 1000) / 1000;
  }
  return out;
}

const table = {};
for (const face of FACES) table[face.key] = widthsFor(face.file);

// The fallback for anything outside the table: the mean of the lowercase
// letters, which is what unmapped characters most often are.
const fallback = {};
for (const [key, widths] of Object.entries(table)) {
  const lower = 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => widths[c]);
  fallback[key] = Math.round((lower.reduce((a, b) => a + b, 0) / lower.length) * 1000) / 1000;
}

const body = `/**
 * GENERATED FILE - do not edit by hand.
 * Run: node scripts/generate-carousel-type-metrics.mjs
 *
 * Advance widths as a fraction of the font size, read straight from the TTFs in
 * public/fonts. The carousel's type fit is arithmetic rather than measurement
 * because the PDF lane renders server-side with no DOM to measure in, and all
 * three lanes have to agree on the size or a deck looks different in the
 * preview, the PNG and the PDF.
 */

export type CarouselTypeFace = ${Object.keys(table).map((k) => `'${k}'`).join(' | ')};

export const CAROUSEL_GLYPH_WIDTHS: Record<CarouselTypeFace, Record<string, number>> = ${JSON.stringify(table, null, 2)};

/** Mean lowercase width, used for any character the table does not carry. */
export const CAROUSEL_GLYPH_FALLBACK: Record<CarouselTypeFace, number> = ${JSON.stringify(fallback, null, 2)};
`;

writeFileSync('lib/content/carousel-type-metrics.ts', body);
console.log('wrote lib/content/carousel-type-metrics.ts');
for (const [key, value] of Object.entries(fallback)) console.log(`  ${key} mean lowercase ${value}em`);
