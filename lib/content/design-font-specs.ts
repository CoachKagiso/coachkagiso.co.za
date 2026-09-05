/**
 * Which font faces the PNG export has to have in hand before it shoots.
 *
 * The PNG lane photographs the live DOM with html2canvas, which reads the page
 * as it stands at that instant. A face the browser has not fetched yet is not
 * waited for - it is drawn in whatever fallback the stack resolves to, and a
 * fallback has different glyph widths. The text then sits at a different width
 * from the one it was laid out at, which is what "the positions are off" looks
 * like in an export that is otherwise a faithful photograph.
 *
 * The old code loaded each family twice, at weight 400 and weight 700, and
 * never at italic. The inspector offers 300 to 900 in steps of 100; the shipped
 * templates use 600 and 800; and un-bolding an inline run sets 500, which makes
 * 500 one of the commonest weights in the app and one that was never loaded.
 * Poppins now ships italics too.
 *
 * So the set is not guessed from a list of families - it is read back off the
 * nodes about to be captured, which already carry the resolved weight and style
 * for every span, including the children of a saved group.
 */

export type DesignFontUsage = {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
};

/**
 * CSS font shorthands to hand to `document.fonts.load`, one per family, weight
 * and style actually in use.
 *
 * The size is arbitrary - `load` matches a face, not a size - so 16px stands in
 * for all of them and keeps the set small.
 */
export function collectDesignFontSpecs(usages: Iterable<DesignFontUsage>): string[] {
  const specs = new Set<string>();

  for (const usage of usages) {
    if (!usage.fontFamily) continue;
    const weight = String(usage.fontWeight || '400').trim() || '400';
    const style = usage.fontStyle === 'italic' || usage.fontStyle === 'oblique' ? 'italic ' : '';

    for (const part of usage.fontFamily.split(',')) {
      const family = part.trim().replace(/^["']|["']$/g, '');
      // A generic keyword is always available and has nothing to fetch; asking
      // for it just makes the shorthand ambiguous.
      if (!family || GENERIC_FAMILIES.has(family.toLowerCase())) continue;
      specs.add(`${style}${weight} 16px "${family}"`);
    }
  }

  return [...specs];
}

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);
