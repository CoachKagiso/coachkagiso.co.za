'use client';

import { useCallback, useState } from 'react';
import { Bold } from 'lucide-react';
import { AutoGrowTextarea } from '@/components/content/AutoGrowTextarea';
import { isBoldShortcut, toggleBoldMarkers } from '@/lib/content/bold-markers';

/**
 * A slide copy field with a bold control.
 *
 * Both renderers already read `**like this**` and set that run heavier, so
 * emboldening a phrase has always been possible by typing the markers. This is
 * the part that was missing: selecting a phrase and pressing a button, or
 * ctrl/cmd-B, without having to know the markers exist.
 *
 * A whole component rather than a hook the editor could call, because the
 * fields are rendered inside a map over the slides - a hook there would run a
 * different number of times per render, which is not allowed.
 *
 * Only offered on the copy the slide renderer parses. The post caption is not
 * one of them: it goes to LinkedIn as plain text, where the markers would be
 * published as literal asterisks.
 */
export function BoldableField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [element, setElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const applyBold = useCallback(() => {
    if (!element) return;
    const next = toggleBoldMarkers(value, element.selectionStart ?? 0, element.selectionEnd ?? 0);
    if (next.value === value) return;
    onChange(next.value);
    // Put the selection back after React has written the new value. Without
    // this the caret lands at the end of the field, so the shortcut cannot be
    // pressed twice in a row and typing carries on in the wrong place.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(next.start, next.end);
    });
  }, [element, value, onChange]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isBoldShortcut(event)) return;
      event.preventDefault();
      applyBold();
    },
    [applyBold],
  );

  return (
    <label className="mt-3 grid gap-2">
      <span className="flex items-center gap-2">
        <span className="studio-label">{label}</span>
        <button
          type="button"
          // Keeps the field's selection alive: taking focus first would collapse
          // it, and there would be nothing left to embolden.
          onMouseDown={(event) => event.preventDefault()}
          onClick={applyBold}
          title="Bold the selection (Ctrl+B)"
          aria-label={`Bold the selected text in ${label}`}
          className="grid h-5 w-5 place-items-center rounded-[4px] border border-[#E4D8CB] bg-white text-[#8C7466] transition hover:border-[#142334] hover:text-[#142334]"
        >
          <Bold className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </span>
      {multiline ? (
        <AutoGrowTextarea
          value={value}
          onChange={onChange}
          onElement={setElement}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={setElement}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="studio-input h-11 w-full px-3"
        />
      )}
    </label>
  );
}
