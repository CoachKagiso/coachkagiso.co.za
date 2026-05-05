'use client';

import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

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
