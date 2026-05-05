'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

type ParallaxWordProps = {
  children: string;
  className?: string;
  distance?: number;
};

export default function ParallaxWord({
  children,
  className = '',
  distance = 280,
}: ParallaxWordProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, distance]);

  return (
    <motion.div ref={ref} style={{ x }} className={className} aria-hidden="true">
      {children}
    </motion.div>
  );
}
