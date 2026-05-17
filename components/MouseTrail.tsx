"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const interactiveSelector = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const pointerSelector = [
  "a",
  "button:not(:disabled)",
  "summary",
  "[role='button']:not([aria-disabled='true'])",
  "[role='link']",
  "input[type='button']:not(:disabled)",
  "input[type='submit']:not(:disabled)",
  "input[type='reset']:not(:disabled)",
  "input[type='checkbox']:not(:disabled)",
  "input[type='radio']:not(:disabled)",
  "label[for]",
].join(",");

const smoothSpring = {
  damping: 42,
  mass: 0.55,
  stiffness: 320,
};

type CursorState = {
  darkSurface: boolean;
  interactive: boolean;
  pointerTarget: boolean;
  pressed: boolean;
  visible: boolean;
};

const initialCursorState: CursorState = {
  darkSurface: false,
  interactive: false,
  pointerTarget: false,
  pressed: false,
  visible: false,
};

function parseRgbChannels(color: string) {
  const matches = color.match(/[\d.]+/g);
  if (!matches || matches.length < 3) return null;

  const [red, green, blue, alpha] = matches.map(Number);

  return {
    alpha: alpha ?? 1,
    blue,
    green,
    red,
  };
}

function getRelativeLuminance(red: number, green: number, blue: number) {
  const toLinear = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

function isDarkSurface(target: Element | null) {
  let current: Element | null = target;
  let depth = 0;

  while (current && depth < 10) {
    const backgroundColor = window.getComputedStyle(current).backgroundColor;
    const channels = parseRgbChannels(backgroundColor);

    if (channels && channels.alpha > 0.03) {
      return getRelativeLuminance(channels.red, channels.green, channels.blue) < 0.18;
    }

    current = current.parentElement;
    depth += 1;
  }

  return false;
}

function mergeCursorState(current: CursorState, next: Partial<CursorState>) {
  const merged = { ...current, ...next };

  return Object.keys(merged).every((key) => current[key as keyof CursorState] === merged[key as keyof CursorState])
    ? current
    : merged;
}

export default function MouseTrail() {
  const [cursorState, setCursorState] = useState<CursorState>(initialCursorState);
  const [isTouch, setIsTouch] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const circleX = useSpring(-100, smoothSpring);
  const circleY = useSpring(-100, smoothSpring);

  useEffect(() => {
    const touchPointer = window.matchMedia("(hover: none), (pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncAvailability = () => {
      const shouldDisable = touchPointer.matches || reducedMotion.matches;
      setIsTouch(shouldDisable);
      document.documentElement.classList.toggle("has-custom-cursor", !shouldDisable);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const shouldHide = Boolean(target?.closest("[data-hide-custom-cursor]"));
      const interactiveTarget = target?.closest(interactiveSelector);

      cursorX.set(event.clientX);
      cursorY.set(event.clientY);
      circleX.set(event.clientX);
      circleY.set(event.clientY);
      setCursorState((current) =>
        mergeCursorState(current, {
          darkSurface: isDarkSurface(target),
          interactive: Boolean(interactiveTarget),
          pointerTarget: Boolean(target?.closest(pointerSelector)),
          visible: !shouldHide,
        }),
      );
    };

    const handleMouseDown = () => {
      setCursorState((current) => mergeCursorState(current, { pressed: true }));
    };

    const handleMouseUp = () => {
      setCursorState((current) => mergeCursorState(current, { pressed: false }));
    };

    const handleMouseLeave = () => {
      setCursorState((current) => mergeCursorState(current, { pressed: false, visible: false }));
    };

    const handleMouseEnter = () => {
      setCursorState((current) => mergeCursorState(current, { visible: true }));
    };

    syncAvailability();
    touchPointer.addEventListener("change", syncAvailability);
    reducedMotion.addEventListener("change", syncAvailability);
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      touchPointer.removeEventListener("change", syncAvailability);
      reducedMotion.removeEventListener("change", syncAvailability);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [circleX, circleY, cursorX, cursorY]);

  if (isTouch) return null;

  const dotColor = "#C9AD98";
  const outlineColor = cursorState.pointerTarget ? "#d7c2b2" : "rgba(201, 173, 152, 0.72)";
  const outlineFill = cursorState.darkSurface
    ? cursorState.interactive
      ? "rgba(201, 173, 152, 0.18)"
      : "rgba(201, 173, 152, 0.08)"
    : cursorState.interactive
      ? "rgba(201, 173, 152, 0.08)"
      : "rgba(201, 173, 152, 0)";
  const outlineScale = (cursorState.interactive ? 1.52 : 1) * (cursorState.pressed ? 0.78 : 1);

  return (
    <>
      <motion.div
        data-custom-cursor-dot
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10000] transition-opacity duration-100 ease-out"
        style={{
          x: cursorX,
          y: cursorY,
          opacity: cursorState.visible && !cursorState.pointerTarget ? 1 : 0,
        }}
      >
        <div className="h-2 w-2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{
              backgroundColor: dotColor,
              scale: cursorState.pressed ? 1.4 : 1,
            }}
            className="h-full w-full rounded-full"
            transition={{ duration: 0.14, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      <motion.div
        data-custom-cursor-outline
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] transition-opacity duration-100 ease-out"
        style={{
          x: circleX,
          y: circleY,
          opacity: cursorState.visible ? 1 : 0,
        }}
      >
        <div className="h-9 w-9 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            data-custom-cursor-ring
            animate={{
              backgroundColor: outlineFill,
              borderWidth: cursorState.pointerTarget ? 2 : 1,
              borderColor: outlineColor,
              scale: outlineScale,
            }}
            className="relative flex h-full w-full items-center justify-center rounded-full border"
            transition={{
              backgroundColor: { duration: 0.16, ease: "easeOut" },
              borderWidth: { duration: 0.14, ease: "easeOut" },
              borderColor: { duration: 0.16, ease: "easeOut" },
              scale: { damping: 28, mass: 0.7, stiffness: 260, type: "spring" },
            }}
          />
        </div>
      </motion.div>
    </>
  );
}
