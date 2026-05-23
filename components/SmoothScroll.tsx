'use client';

import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

function shouldUseNativeScroll(node: HTMLElement) {
  return (
    node.matches('textarea, select, [data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-touch]') ||
    Boolean(node.closest('[data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-touch]'))
  );
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
        wheelMultiplier: 0.9,
        touchMultiplier: 1.15,
        prevent: shouldUseNativeScroll,
        anchors: {
          offset: -88,
          duration: 1,
        },
      }}
    >
      {children}
    </ReactLenis>
  );
}
