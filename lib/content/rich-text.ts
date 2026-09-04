/**
 * The inline styling a slide's copy can carry, and how it is written down.
 *
 * The renderers draw the slide themselves, so the styling is markers in the
 * text rather than the Unicode substitution a plain-text post would need. One
 * parser here, read by both lanes, so the preview and the PDF cannot disagree
 * about what a run is.
 */

/**
 * Two characters each, and no two sharing a prefix.
 *
 * Italic was `*` first, which shares its opening with bold: `**bold and
 * *italic***` then parses as a bold run ending early with a stray asterisk
 * left on the slide, because there is no way to tell the three closing
 * asterisks apart without a real parser. Distinct pairs make the ambiguity
 * impossible instead of handling it, and nobody types these - the buttons and
 * the shortcuts write them.
 */
export const RICH_TEXT_MARKERS = {
  bold: '**',
  italic: '~~',
  underline: '__',
} as const;

export type RichTextStyle = keyof typeof RICH_TEXT_MARKERS;

export type RichRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

/** Splits the runs of one style out of a list of runs. */
function splitStyle(runs: RichRun[], style: RichTextStyle, pattern: RegExp): RichRun[] {
  const out: RichRun[] = [];
  for (const run of runs) {
    const parts = run.text.split(pattern);
    parts.forEach((part, index) => {
      if (!part) return;
      // The capture groups land on the odd indexes: those are the wrapped runs.
      out.push({ ...run, text: part, [style]: index % 2 === 1 || run[style] });
    });
  }
  return out;
}

/**
 * The copy as styled runs. Unmatched markers stay in the text as themselves,
 * which is what a lone asterisk in a sentence should do.
 */
export function parseRichText(text: string): RichRun[] {
  const source = String(text ?? '');
  if (!source) return [];
  let runs: RichRun[] = [{ text: source, bold: false, italic: false, underline: false }];
  runs = splitStyle(runs, 'bold', /\*\*(.+?)\*\*/g);
  runs = splitStyle(runs, 'italic', /~~(.+?)~~/g);
  runs = splitStyle(runs, 'underline', /__(.+?)__/g);
  return runs;
}

/** The copy with every marker removed, for measuring and for plain-text uses. */
export function stripRichText(text: string): string {
  return parseRichText(text)
    .map((run) => run.text)
    .join('');
}
