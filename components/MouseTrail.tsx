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

export default function MouseTrail() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
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
    if (!ring || !dot) return;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPosition = { ...pointer };
    let isVisible = false;
    let isPressed = false;
    let isInteractive = false;
    let frame = 0;

    const setVisibility = (visible: boolean) => {
      isVisible = visible;
      const opacity = visible ? "1" : "0";
      ring.style.opacity = opacity;
      dot.style.opacity = opacity;
    };

    const animate = () => {
      ringPosition.x += (pointer.x - ringPosition.x) * 0.18;
      ringPosition.y += (pointer.y - ringPosition.y) * 0.18;

      const interactiveScale = isInteractive ? 1.52 : 1;
      const pressedScale = isPressed ? 0.78 : 1;

      ring.style.transform = `translate3d(${ringPosition.x - 18}px, ${ringPosition.y - 18}px, 0) scale(${interactiveScale * pressedScale})`;
      dot.style.transform = `translate3d(${pointer.x - 3}px, ${pointer.y - 3}px, 0) scale(${isPressed ? 1.4 : 1})`;

      frame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;

      pointer.x = event.clientX;
      pointer.y = event.clientY;

      const target = event.target instanceof Element ? event.target : null;
      const shouldHide = Boolean(target?.closest("[data-hide-custom-cursor]"));
      isInteractive = Boolean(target?.closest(interactiveSelector));

      ring.style.borderColor = isInteractive ? "rgba(201, 173, 152, 0.92)" : "rgba(20, 35, 52, 0.72)";
      ring.style.backgroundColor = isInteractive ? "rgba(201, 173, 152, 0.08)" : "transparent";
      dot.style.backgroundColor = isInteractive ? "#C9AD98" : "#142334";

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
    </>
  );
}
