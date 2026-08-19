import { Fragment, type ReactNode } from 'react';
import { createEmphasisPattern } from '@/lib/report-emphasis';

export { stripEmphasis } from '@/lib/report-emphasis';

/**
 * Renders the only inline mark the report generators are allowed to emit: **bold**.
 *
 * Everything is built as React nodes, so there is no HTML parsing and no
 * dangerouslySetInnerHTML. Unmatched or stray asterisks are left as literal text
 * rather than swallowed, which keeps older stored reports rendering unchanged.
 */
export function renderRichText(value: string): ReactNode[] {
  const pattern = createEmphasisPattern();
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`t-${lastIndex}`}>{value.slice(lastIndex, match.index)}</Fragment>);
    }
    // Colour is inherited so the same mark works on the light cards and the dark panels.
    nodes.push(
      <strong key={`b-${match.index}`} className="font-semibold">
        {match[1]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    nodes.push(<Fragment key={`t-${lastIndex}`}>{value.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

export default function RichText({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  return <p className={className}>{renderRichText(value)}</p>;
}

/** Inline variant for when the surrounding element already supplies the block styling. */
export function RichTextInline({ value }: { value?: string | null }) {
  if (!value) return null;
  return <>{renderRichText(value)}</>;
}
