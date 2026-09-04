import { RICH_TEXT_MARKERS, type RichTextStyle } from './rich-text.ts';

/**
 * Toggling a style's markers around a text selection.
 *
 * The slide renderers already read these markers - both lanes split on
 * `**...**` and set that run heavier - so this is only about writing them, and
 * about putting the caret back where the typist expects it afterwards.
 *
 * Pure on purpose: the whole of the fiddly part is index arithmetic, and index
 * arithmetic is worth testing without a DOM.
 */

export type MarkedSelection = { value: string; start: number; end: number };

/**
 * Wraps the selection in markers, or removes them if they are already there.
 *
 * Whitespace at the edges of a selection is left outside the markers. Selecting
 * a word by double-clicking often takes the trailing space with it, and
 * `**word **` sets a bold space - visible as extra letter-spacing before the
 * next word, and baffling to whoever has to find it later.
 *
 * With nothing selected it inserts an empty pair and puts the caret inside, so
 * the shortcut can be pressed before typing rather than after.
 */
export function toggleTextMarkers(
  value: string,
  start: number,
  end: number,
  style: RichTextStyle = 'bold',
): MarkedSelection {
  const MARKER = RICH_TEXT_MARKERS[style];
  const from = Math.max(0, Math.min(start, end, value.length));
  const to = Math.max(0, Math.min(Math.max(start, end), value.length));

  if (from === to) {
    return {
      value: `${value.slice(0, from)}${MARKER}${MARKER}${value.slice(from)}`,
      start: from + MARKER.length,
      end: from + MARKER.length,
    };
  }

  const selected = value.slice(from, to);

  // Already wrapped, markers inside the selection.
  if (selected.length > MARKER.length * 2 && selected.startsWith(MARKER) && selected.endsWith(MARKER)) {
    const inner = selected.slice(MARKER.length, -MARKER.length);
    return {
      value: value.slice(0, from) + inner + value.slice(to),
      start: from,
      end: from + inner.length,
    };
  }

  // Already wrapped, markers just outside the selection.
  const before = value.slice(Math.max(0, from - MARKER.length), from);
  const after = value.slice(to, to + MARKER.length);
  if (before === MARKER && after === MARKER) {
    const cut = from - MARKER.length;
    return {
      value: value.slice(0, cut) + selected + value.slice(to + MARKER.length),
      start: cut,
      end: cut + selected.length,
    };
  }

  const leading = selected.length - selected.trimStart().length;
  const trailing = selected.length - selected.trimEnd().length;
  const core = selected.slice(leading, selected.length - trailing);

  // A selection of nothing but whitespace has no word to embolden.
  if (!core) return { value, start: from, end: to };

  const head = value.slice(0, from + leading);
  const tail = value.slice(to - trailing);
  return {
    value: `${head}${MARKER}${core}${MARKER}${tail}`,
    start: from + leading + MARKER.length,
    end: from + leading + MARKER.length + core.length,
  };
}

/** Which style a keyboard event asks for, on either platform, or null. */
export function styleShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}): RichTextStyle | null {
  if (!event.metaKey && !event.ctrlKey) return null;
  const key = event.key.toLowerCase();
  if (key === 'b') return 'bold';
  if (key === 'i') return 'italic';
  if (key === 'u') return 'underline';
  return null;
}
