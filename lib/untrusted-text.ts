function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Removes any opening or closing form of a delimiter tag from untrusted text, so a sender
 * cannot forge the boundary and appear to escape the quoted block.
 *
 * Deliberately wider than a literal `</tag>` match: it also catches `</ tag >`, mixed case,
 * and `<tag attr="x">`. It does not defend against unicode lookalikes, because the delimiter
 * is a hint and the system-prompt rule is the real control.
 */
export function stripUntrustedDelimiters(
  value: string,
  tag: string,
  replacement = `[${tag} delimiter removed]`,
) {
  const pattern = new RegExp(`<\\s*/?\\s*${escapeRegExp(tag)}(?:\\s[^>]*)?\\s*>`, 'gi');
  return String(value ?? '').replace(pattern, replacement);
}

/** Wraps untrusted text in a delimiter tag after stripping any forged copies of that tag. */
export function wrapUntrusted(tag: string, value: string, replacement?: string) {
  return `<${tag}>\n${stripUntrustedDelimiters(value, tag, replacement)}\n</${tag}>`;
}
