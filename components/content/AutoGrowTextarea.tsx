'use client';

import React, { useEffect, useState } from 'react';

/**
 * A textarea that is always exactly as tall as its content.
 *
 * The height is set from `scrollHeight` after resetting to `auto`, which is
 * what makes it shrink again as well as grow. The border widths have to be
 * added back: preflight puts every box on `border-box`, and `scrollHeight`
 * does not include the border, so the field would sit two pixels short and
 * scroll by exactly that.
 *
 * The `rows` attribute is still the floor - with the height on `auto` the box
 * falls back to it, and `scrollHeight` is never less than the visible height.
 *
 * No `trapWheel` here, deliberately. That guard exists to stop a scrollable
 * panel handing its overscroll to the page; a field that never scrolls has
 * none to hand over, and trapping the wheel over what is often the tallest
 * thing on screen would just stop the page scrolling.
 */
export function AutoGrowTextarea({
  value,
  onChange,
  minRows = 3,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'rows' | 'className'>) {
  // A callback ref held in state, so the measure re-runs when the element
  // mounts - slides are added, removed and reordered under this.
  const [element, setElement] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!element) return;
    element.style.height = 'auto';
    const styles = window.getComputedStyle(element);
    const borders = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    element.style.height = `${element.scrollHeight + borders}px`;
  }, [element, value]);

  return (
    <textarea
      {...rest}
      ref={setElement}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={minRows}
      className={`studio-input w-full resize-none overflow-hidden px-3 py-3 leading-relaxed ${className || ''}`}
    />
  );
}
