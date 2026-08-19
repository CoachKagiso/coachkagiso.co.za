/**
 * Single source of truth for the one inline mark the report generators may emit: **bold**.
 *
 * The on-screen report renders it (components/career-tools/RichText.tsx); every plain-text
 * destination — clipboard, .txt download, PDF, DOCX — must strip it instead, or readers see
 * literal asterisks.
 */

/** Built fresh per call so a shared lastIndex can never leak between callers. */
export function createEmphasisPattern(): RegExp {
  return /\*\*([^*]+)\*\*/g;
}

export function stripEmphasis(value: string): string {
  return value.replace(createEmphasisPattern(), '$1');
}
