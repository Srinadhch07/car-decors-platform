import { useEffect, useRef } from "react";
import { canAnimate } from "./environment";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Subtle, pointer-driven 3D tilt for a card surface.
 *
 * Opt-in and conservative by design: it runs only on real, hover-capable
 * pointers, is disabled entirely under `prefers-reduced-motion`, and animates a
 * single element transform through `requestAnimationFrame` (at most one frame
 * in flight, cleaned up on unmount). It never blocks clicks, because the
 * transform is applied to the card container while interactive children stay on
 * top.
 *
 * @param max Maximum rotation in degrees applied to each axis (default 5).
 */
export function useTilt<T extends HTMLElement = HTMLElement>(max = 5) {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduced || !canAnimate() || !supportsHoverTilt()) return;

    let frame: number | null = null;

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const rotateX = (-py * max).toFixed(2);
        const rotateY = (px * max).toFixed(2);
        element.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
    };

    const reset = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      element.style.transform = "";
    };

    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerleave", reset);

    return () => {
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", reset);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      element.style.transform = "";
    };
  }, [max, reduced]);

  return ref;
}

/** Guard for hover-capable pointers only (fine mouse, not touch). */
function supportsHoverTilt(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
