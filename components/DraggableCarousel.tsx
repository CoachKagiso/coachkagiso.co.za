"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

type CarouselItem = {
  src: string;
  alt: string;
};

const defaultCarouselItems: CarouselItem[] = [
  {
    src: "/images/contact/contact-year-of-yes.jpeg",
    alt: "A calm lifestyle workspace with coffee, laptop, and a book on a bed",
  },
  {
    src: "/images/contact/contact-coaching-session.jpg",
    alt: "Kagiso in a coaching conversation across a table",
  },
  {
    src: "/images/contact/contact-library.jpg",
    alt: "Kagiso selecting a book in a warmly lit library",
  },
  {
    src: "/images/contact/contact-seated-portrait.png",
    alt: "Kagiso seated in a bright lounge setting with a book",
  },
  {
    src: "/images/contact/contact-study-session.jpeg",
    alt: "Study and planning session in a bright library workspace",
  },
  {
    src: "/images/contact/contact-laptop.png",
    alt: "Close-up of Kagiso working on a laptop",
  },
];

export default function DraggableCarousel({ items = defaultCarouselItems }: { items?: CarouselItem[] }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [constraintLeft, setConstraintLeft] = useState(0);
  const carouselImages = [...items, ...items, ...items, ...items];

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
