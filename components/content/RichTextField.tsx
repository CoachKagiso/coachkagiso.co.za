'use client';

import { useCallback, useState } from 'react';
import { Bold, Italic, Plus, Underline } from 'lucide-react';
import { AutoGrowTextarea } from '@/components/content/AutoGrowTextarea';
import { styleShortcut, toggleTextMarkers } from '@/lib/content/text-markers';
import type { RichTextStyle } from '@/lib/content/rich-text';

/**
 * A slide copy field with the styling the renderers can actually draw.
 *
 * Bold, italic and underline write markers that both lanes parse; ctrl/cmd-B,
 * -I and -U do the same from the keyboard.
 *
 * The insert list is short on purpose. Poppins carries the middot, the bullet
 * and the em dash, and nothing else on the usual list of arrows, ticks and
 * stars - checked against the font file rather than against a browser, which
 * would have silently substituted another face and hidden the gap until the
 * PDF came out with holes in it. Emoji are absent for the same reason: they
 * need an emoji source registered with @react-pdf or they export blank.
 *
 * A whole component rather than a hook the editor could call, because the
 * fields are rendered inside a map over the slides - a hook there would run a
 * different number of times per render, which is not allowed.
 */

const STYLE_BUTTONS: Array<{ style: RichTextStyle; label: string; Icon: typeof Bold }> = [
  { style: 'bold', label: 'Bold', Icon: Bold },
  { style: 'italic', label: 'Italic', Icon: Italic },
  { style: 'underline', label: 'Underline', Icon: Underline },
];

/** Only marks Poppins can draw. See the note above. */
const INSERTS: Array<{ label: string; value: string }> = [
  { label: '• bullet', value: '• ' },
  { label: '· middot', value: '· ' },
  { label: '— dash', value: ' — ' },
];

export function RichTextField({
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
  const [insertOpen, setInsertOpen] = useState(false);

  /** Puts the selection back after React has written the new value. */
  const restore = useCallback(
    (start: number, end: number) => {
      requestAnimationFrame(() => {
        element?.focus();
        element?.setSelectionRange(start, end);
      });
    },
    [element],
  );

  const applyStyle = useCallback(
    (style: RichTextStyle) => {
      if (!element) return;
      const next = toggleTextMarkers(value, element.selectionStart ?? 0, element.selectionEnd ?? 0, style);
      if (next.value === value) return;
      onChange(next.value);
      // Left alone the caret lands at the end of the field, so a second press
      // cannot reach the same words and typing carries on in the wrong place.
      restore(next.start, next.end);
    },
    [element, value, onChange, restore],
  );

  const insert = useCallback(
    (snippet: string) => {
      setInsertOpen(false);
      const at = element?.selectionStart ?? value.length;
      onChange(value.slice(0, at) + snippet + value.slice(element?.selectionEnd ?? at));
      restore(at + snippet.length, at + snippet.length);
    },
    [element, value, onChange, restore],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const style = styleShortcut(event);
      if (!style) return;
      event.preventDefault();
      applyStyle(style);
    },
    [applyStyle],
  );

  return (
    <label className="mt-3 grid gap-2">
      <span className="relative flex items-center gap-1.5">
        <span className="studio-label">{label}</span>
        {STYLE_BUTTONS.map(({ style, label: styleLabel, Icon }) => (
          <button
            key={style}
            type="button"
            // Keeps the field's selection alive: taking focus first collapses
            // it, and there is nothing left to style.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyStyle(style)}
            title={`${styleLabel} the selection`}
            aria-label={`${styleLabel} the selected text in ${label}`}
            className="grid h-5 w-5 place-items-center rounded-[4px] border border-[#E4D8CB] bg-white text-[#8C7466] transition hover:border-[#142334] hover:text-[#142334]"
          >
            <Icon className="h-3 w-3" strokeWidth={2.5} />
          </button>
        ))}
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setInsertOpen((open) => !open)}
          title="Insert a mark"
          aria-label={`Insert a mark into ${label}`}
          aria-expanded={insertOpen}
          className="grid h-5 w-5 place-items-center rounded-[4px] border border-[#E4D8CB] bg-white text-[#8C7466] transition hover:border-[#142334] hover:text-[#142334]"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
        </button>
        {insertOpen && (
          <span className="absolute left-0 top-6 z-20 grid gap-0.5 rounded-[6px] border border-[#E4D8CB] bg-white p-1 shadow-lg">
            {INSERTS.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(snippet.value)}
                className="rounded-[4px] px-2 py-1 text-left text-[12px] text-[#142334] hover:bg-[#F5F3EE]"
              >
                {snippet.label}
              </button>
            ))}
          </span>
        )}
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
