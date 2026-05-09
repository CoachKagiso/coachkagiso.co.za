"use client";

import { useEffect, useRef, useState } from "react";

const interactiveSelector = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "[role='button']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function parseRgbChannels(color: string) {
  const matches = color.match(/[\d.]+/g);
  if (!matches || matches.length < 3) return null;

  const [red, green, blue, alpha] = matches.map(Number);

  return {
    red,
    green,
    blue,
    alpha: alpha ?? 1,
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

export default function MouseTrail() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncEnabled = () => {
      const shouldEnable = finePointer.matches && !reducedMotion.matches;
      setEnabled(shouldEnable);
      document.documentElement.classList.toggle("has-custom-cursor", shouldEnable);
    };

    syncEnabled();
    finePointer.addEventListener("change", syncEnabled);
    reducedMotion.addEventListener("change", syncEnabled);

    return () => {
      finePointer.removeEventListener("change", syncEnabled);
      reducedMotion.removeEventListener("change", syncEnabled);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    const hand = handRef.current;
    if (!ring || !dot || !hand) return;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPosition = { ...pointer };
    let isVisible = false;
    let isPressed = false;
    let isInteractive = false;
    let isLink = false;
    let frame = 0;

    const setVisibility = (visible: boolean) => {
      isVisible = visible;
      ring.style.opacity = visible ? "1" : "0";
      dot.style.opacity = visible && !isLink ? "1" : "0";
      hand.style.opacity = visible && isLink ? "1" : "0";
    };

    const animate = () => {
      ringPosition.x += (pointer.x - ringPosition.x) * 0.18;
      ringPosition.y += (pointer.y - ringPosition.y) * 0.18;

      const interactiveScale = isInteractive ? 1.52 : 1;
      const pressedScale = isPressed ? 0.78 : 1;

      ring.style.transform = `translate3d(${ringPosition.x - 18}px, ${ringPosition.y - 18}px, 0) scale(${interactiveScale * pressedScale})`;
      dot.style.transform = `translate3d(${pointer.x - 3}px, ${pointer.y - 3}px, 0) scale(${isPressed ? 1.4 : 1})`;
      hand.style.transform = `translate3d(${ringPosition.x - 12}px, ${ringPosition.y - 12}px, 0) scale(${isPressed ? 0.92 : 1})`;

      frame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;

      pointer.x = event.clientX;
      pointer.y = event.clientY;

      const target = event.target instanceof Element ? event.target : null;
      const shouldHide = Boolean(target?.closest("[data-hide-custom-cursor]"));
      const darkSurface = isDarkSurface(target);
      const interactiveTarget = target?.closest(interactiveSelector);
      isInteractive = Boolean(target?.closest(interactiveSelector));
      isLink = Boolean(target?.closest("a"));

      if (darkSurface) {
        ring.style.borderColor = isInteractive ? "rgba(244, 239, 235, 0.95)" : "rgba(201, 173, 152, 0.96)";
        ring.style.backgroundColor = isInteractive ? "rgba(201, 173, 152, 0.18)" : "rgba(201, 173, 152, 0.08)";
        dot.style.backgroundColor = isInteractive ? "#F4EFEB" : "#C9AD98";
        hand.style.color = "#F4EFEB";
      } else {
        ring.style.borderColor = isInteractive ? "rgba(201, 173, 152, 0.92)" : "rgba(20, 35, 52, 0.72)";
        ring.style.backgroundColor = isInteractive ? "rgba(201, 173, 152, 0.08)" : "transparent";
        dot.style.backgroundColor = isInteractive ? "#C9AD98" : "#142334";
        hand.style.color = "#C9AD98";
      }

      if (!interactiveTarget) {
        isInteractive = false;
      }

      setVisibility(!shouldHide);
    };

    const handlePointerDown = () => {
      isPressed = true;
    };

    const handlePointerUp = () => {
      isPressed = false;
    };

    const handleLeave = () => setVisibility(false);
    const handleEnter = () => setVisibility(true);

    frame = window.requestAnimationFrame(animate);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-9 w-9 rounded-full border transition-[opacity,border-color,background-color] duration-200"
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10000] h-1.5 w-1.5 rounded-full transition-[opacity,background-color] duration-150"
      />
      <div
        ref={handRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[10001] flex h-6 w-6 items-center justify-center opacity-0 transition-[opacity,color] duration-150"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 11.5V6.75a1.25 1.25 0 1 1 2.5 0V10" />
          <path d="M9.5 10V5.75a1.25 1.25 0 1 1 2.5 0V10" />
          <path d="M12 10V7a1.25 1.25 0 1 1 2.5 0v5.5" />
          <path d="M14.5 10.5a1.25 1.25 0 1 1 2.5 0v5.25c0 2.9-2.35 5.25-5.25 5.25h-.75A6 6 0 0 1 5 15v-2.2a1.3 1.3 0 0 1 2.22-.92L9.5 14" />
        </svg>
      </div>
    </>
  );
}
