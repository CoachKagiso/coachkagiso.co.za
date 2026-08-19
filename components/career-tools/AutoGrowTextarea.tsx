'use client';

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from 'react';

type AutoGrowTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  function AutoGrowTextarea({ className = '', onInput, value, ...props }, forwardedRef) {
    const localRef = useRef<HTMLTextAreaElement | null>(null);

    const setRef = useCallback((node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    const resize = useCallback(() => {
      const node = localRef.current;
      if (!node) return;
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
      node.style.overflowY = 'hidden';
    }, []);

    useLayoutEffect(() => {
      resize();
    }, [resize, value]);

    return (
      <textarea
        {...props}
        ref={setRef}
        value={value}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        className={`resize-none overflow-hidden ${className}`}
      />
    );
  },
);

export default AutoGrowTextarea;
