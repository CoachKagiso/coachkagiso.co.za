"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const carouselItems = [
  {
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop",
    alt: "Professional woman smiling confidently in a modern office",
  },
  {
    src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop",
    alt: "Team collaborating on career strategy around a conference table",
  },
  {
    src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800&auto=format&fit=crop",
    alt: "Professional woman working on a laptop in a creative workspace",
  },
  {
    src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop",
    alt: "Coaching session between two professionals at a desk",
  },
  {
    src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop",
    alt: "Person reviewing career goals on a digital device",
  },
  {
    src: "https://images.unsplash.com/photo-1573497491208-6b1acb260507?q=80&w=800&auto=format&fit=crop",
    alt: "Professional woman in a coaching conversation with a colleague",
  },
];

// Repeat 4 times to simulate an infinite feel when dragged
const carouselImages = [...carouselItems, ...carouselItems, ...carouselItems, ...carouselItems];

export default function DraggableCarousel() {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [constraintLeft, setConstraintLeft] = useState(0);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 25, stiffness: 300 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 32); // offset by half width
      cursorY.set(e.clientY - 16); // offset by half height
    };
    window.addEventListener("mousemove", moveCursor);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
    };
  }, [cursorX, cursorY]);

  useEffect(() => {
    if (containerRef.current) {
      // Calculate how far we can drag
      // Full width of track minus width of viewport
      const trackWidth = containerRef.current.scrollWidth;
      const viewportWidth = containerRef.current.offsetWidth;
      setConstraintLeft(-(trackWidth - viewportWidth));
    }
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden h-[60vh] min-h-[400px] max-h-[800px] bg-white group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      {/* Custom Cursor Pill */}
      <motion.div
        className="fixed top-0 left-0 w-16 h-8 rounded-full bg-white text-[#142334] text-[11px] font-semibold flex items-center justify-center pointer-events-none z-50 shadow-lg uppercase tracking-widest border border-[#CDC6C3]/20"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          opacity: isHovered ? (isDragging ? 0.8 : 1) : 0,
          scale: isDragging ? 0.9 : 1,
        }}
      >
        Drag
      </motion.div>

      {/* Draggable Track */}
      <motion.div
        ref={containerRef}
        className="flex gap-1 h-full cursor-none"
        drag="x"
        dragConstraints={{ right: 0, left: constraintLeft }}
        whileTap={{ cursor: "none" }}
      >
        {carouselImages.map((item, idx) => (
          <motion.div
            key={idx}
            className="h-full aspect-[3/4] sm:aspect-[4/5] relative flex-shrink-0"
            whileHover={{ opacity: 0.95 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.alt}
              className="w-full h-full object-cover pointer-events-none"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
