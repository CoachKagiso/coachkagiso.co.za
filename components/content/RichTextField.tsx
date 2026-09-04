'use client';

import { useCallback, useState } from 'react';
import { Bold, Italic, Minus, Plus, Smile, Type, Underline } from 'lucide-react';
import { AutoGrowTextarea } from '@/components/content/AutoGrowTextarea';
import { styleShortcut, toggleTextMarkers } from '@/lib/content/text-markers';
import type { RichTextStyle } from '@/lib/content/rich-text';
import {
  CAROUSEL_TYPE_LIMITS,
  type CarouselTypeSettings,
} from '@/lib/content/carousel-editorial-layout';

/**
 * A slide copy field with the styling the renderers can actually draw.
 *
 * Bold, italic and underline write markers that both lanes parse; ctrl/cmd-B,
 * -I and -U do the same from the keyboard.
 *
 * The insert strips lie along the row rather than dropping below it, so they
 * never cover the copy being edited, and scroll sideways rather than wrapping,
 * so the row keeps its height.
 *
 * Marks and emoji get their own button. Sharing one strip put 41 items in a
 * space that shows about 22 of them, so most of the emoji sat off the right
 * edge - and with the scrollbar hidden there was nothing to say they were
 * there at all. They are two sets, and they are now two strips.
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

/**
 * Marks the renderers can actually draw.
 *
 * Poppins carries the bullet, the middot and the dash; Inter, chained behind it
 * in both lanes, carries the arrows, the tick and the stars. Checked against the
 * font files rather than a browser, which would have substituted another face
 * and hidden the gap until the PDF exported with holes in it. Anything neither
 * font has - the dashed arrow, the four-pointed star - is deliberately absent.
 */
const MARKS = [
  '\u2022', '\u00b7', '\u2014', '\u2192', '\u21b3', '\u21d2',
  '\u2713', '\u2605', '\u2606', '\u25c6', '\u2190', '\u2191', '\u2193',
];

/**
 * The same set the personal brand toolbar offers.
 *
 * These are images in the PDF, not glyphs - no text font carries colour emoji -
 * so the exported artwork is twemoji while the preview shows whatever the
 * viewer's system draws. Same emoji, different hand.
 */
const EMOJI = [
  '\u{1f44f}', '\u{1f64c}', '\u{1f4a1}', '\u{1f525}', '\u2705', '\u274c',
  '\u{1f4c8}', '\u{1f4c9}', '\u{1f3af}', '\u{1f680}', '\u26a1', '\u{1f9e0}',
  '\u{1f4ac}', '\u{1f440}', '\u{1f91d}', '\u2b50', '\u{1f4cc}', '\u{1f511}',
  '\u270d\ufe0f', '\u{1f64f}', '\u{1f4af}', '\u23f1\ufe0f', '\u{1f4ca}', '\u{1f9e9}',
  '\u27a1\ufe0f', '\u2b06\ufe0f', '\u{1f4a5}', '\u{1f331}',
];

const STRIPS = [
  { key: 'marks' as const, Icon: Plus, title: 'Insert a mark' },
  { key: 'emoji' as const, Icon: Smile, title: 'Insert an emoji' },
  { key: 'type' as const, Icon: Type, title: 'Size, tracking and leading' },
];

/**
 * The three dials, and how each reads.
 *
 * Size is a step rather than a point value: it moves the ceiling the fit starts
 * from, so the copy can still come down when a slide runs long. Showing the
 * resolved point size here would be a lie on any slide the fit had shrunk.
 */
const DIALS: Array<{
  key: keyof CarouselTypeSettings;
  label: string;
  step: number;
  min: number;
  max: number;
  format: (value: number) => string;
}> = [
  {
    key: 'sizeStep',
    label: 'Size',
    step: 1,
    min: CAROUSEL_TYPE_LIMITS.minSizeStep,
    max: CAROUSEL_TYPE_LIMITS.maxSizeStep,
    format: (value) => (value > 0 ? `+${value}` : String(value)),
  },
  {
    key: 'tracking',
    label: 'Tracking',
    step: CAROUSEL_TYPE_LIMITS.trackingStep,
    min: CAROUSEL_TYPE_LIMITS.minTracking,
    max: CAROUSEL_TYPE_LIMITS.maxTracking,
    format: (value) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`,
  },
  {
    key: 'leading',
    label: 'Leading',
    step: CAROUSEL_TYPE_LIMITS.leadingStep,
    min: CAROUSEL_TYPE_LIMITS.minLeading,
    max: CAROUSEL_TYPE_LIMITS.maxLeading,
    format: (value) => value.toFixed(2),
  },
];

export function RichTextField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  type,
  onTypeChange,
  defaultLeading,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
  /** Absent means the field offers no type controls. */
  type?: CarouselTypeSettings;
  onTypeChange?: (next: CarouselTypeSettings) => void;
  /** What leading reads as before anyone touches it. */
  defaultLeading?: number;
}) {
  const [element, setElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [openStrip, setOpenStrip] = useState<'marks' | 'emoji' | 'type' | null>(null);

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
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="studio-label shrink-0">{label}</span>
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
        {STRIPS.filter((strip) => strip.key !== 'type' || onTypeChange).map(({ key, Icon, title }) => (
          <button
            key={key}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpenStrip((open) => (open === key ? null : key))}
            title={title}
            aria-label={`${title} in ${label}`}
            aria-expanded={openStrip === key}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border transition ${
              openStrip === key
                ? 'border-[#142334] bg-[#142334] text-white'
                : 'border-[#E4D8CB] bg-white text-[#8C7466] hover:border-[#142334] hover:text-[#142334]'
            }`}
          >
            <Icon className="h-3 w-3" strokeWidth={2.5} />
          </button>
        ))}
        {openStrip === 'type' && onTypeChange && (
          <span className="insert-strip flex min-w-0 flex-1 items-center gap-2 overflow-x-auto rounded-[4px] border border-[#E4D8CB] bg-white px-1.5 py-1">
            {DIALS.map((dial) => {
              const fallback = dial.key === 'leading' ? defaultLeading ?? 1 : 0;
              const current = typeof type?.[dial.key] === 'number' ? (type[dial.key] as number) : fallback;
              const nudge = (direction: -1 | 1) => {
                const next = Math.min(dial.max, Math.max(dial.min, current + direction * dial.step));
                // Rounded, or repeated steps accumulate binary dust and the
                // readout drifts to 1.2800000000000002.
                onTypeChange({ ...type, [dial.key]: Math.round(next * 1000) / 1000 });
              };
              return (
                <span key={dial.key} className="flex shrink-0 items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8C7466]">{dial.label}</span>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => nudge(-1)}
                    disabled={current <= dial.min}
                    aria-label={`Decrease ${dial.label.toLowerCase()} in ${label}`}
                    className="grid h-5 w-5 place-items-center rounded-[3px] border border-[#E4D8CB] text-[#142334] transition hover:bg-[#F5F3EE] disabled:opacity-35"
                  >
                    <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                  </button>
                  <span className="w-9 text-center text-[11px] tabular-nums text-[#142334]">
                    {dial.format(current)}
                  </span>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => nudge(1)}
                    disabled={current >= dial.max}
                    aria-label={`Increase ${dial.label.toLowerCase()} in ${label}`}
                    className="grid h-5 w-5 place-items-center rounded-[3px] border border-[#E4D8CB] text-[#142334] transition hover:bg-[#F5F3EE] disabled:opacity-35"
                  >
                    <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onTypeChange({})}
              className="shrink-0 rounded-[3px] border border-[#E4D8CB] px-2 py-0.5 text-[11px] text-[#8C7466] transition hover:border-[#142334] hover:text-[#142334]"
            >
              Reset
            </button>
          </span>
        )}
        {(openStrip === 'marks' || openStrip === 'emoji') && (
          // A strip along the row, not a panel below it: the fields sit shoulder
          // to shoulder and a panel would cover the copy being edited. The
          // scrollbar is left visible on purpose - hidden, a strip that runs
          // past its edge looks like a list that stops there.
          <span className="insert-strip flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-[4px] border border-[#E4D8CB] bg-white px-1.5 py-1">
            {(openStrip === 'marks' ? MARKS : EMOJI).map((mark) => (
              <button
                key={mark}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(`${mark} `)}
                title={`Insert ${mark}`}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] text-[13px] leading-none text-[#142334] transition hover:bg-[#F5F3EE]"
              >
                {mark}
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
