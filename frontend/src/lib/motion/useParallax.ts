import { useLayoutEffect, useRef } from "react";
import { gsap, ensureScrollTrigger } from "./gsapSetup";
import { canAnimate, isMobileViewport } from "./environment";
import { useReducedMotion } from "./useReducedMotion";

export interface ParallaxVars {
  yPercent?: number;
  start?: string;
  end?: string;
  scrub?: number;
  mobileScale?: number;
}

/**
 * Applies a subtle scroll-linked vertical parallax to the first element matching
 * `selector` inside `scopeRef`. Movement is attenuated on mobile and disabled
 * entirely when reduced motion is requested.
 */
export function useParallax<T extends HTMLElement = HTMLElement>(selector: string, vars: ParallaxVars = {}) {
  const scopeRef = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    const target = scope?.querySelector(selector);
    if (!scope || !target) return;
    if (!canAnimate() || reduced) return;

    ensureScrollTrigger();

    const factor = isMobileViewport() ? (vars.mobileScale ?? 0.35) : 1;
    const amount = (vars.yPercent ?? 18) * factor;

    gsap.fromTo(
      target,
      { yPercent: amount },
      {
        yPercent: -amount,
        ease: "none",
        scrollTrigger: {
          trigger: scope,
          start: vars.start ?? "top bottom",
          end: vars.end ?? "bottom top",
          scrub: vars.scrub ?? 0.6,
        },
      },
    );

    return () => {
      gsap.killTweensOf(target);
    };
  }, [selector, vars.yPercent, vars.start, vars.end, vars.scrub, vars.mobileScale, reduced]);

  return scopeRef;
}