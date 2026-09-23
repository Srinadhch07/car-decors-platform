import { useLayoutEffect, useRef } from "react";
import { gsap, ensureScrollTrigger } from "./gsapSetup";
import { canAnimate, isMobileViewport } from "./environment";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Cinematic hero entrance + scroll parallax.
 *
 * Sequence:
 *   0.0s → hero image begins (scale 1.12 → 1)
 *   0.2s → headline reveals
 *   0.5s → subtitle
 *   0.7s → CTA
 *   1.0s → page is fully interactive (animations never block input)
 */
export function useHeroAnimation<T extends HTMLElement = HTMLElement>() {
  const scopeRef = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope || !canAnimate() || reduced) return;

    ensureScrollTrigger();

    const bg = scope.querySelector<HTMLElement>("[data-hero-media]");
    const headline = scope.querySelectorAll<HTMLElement>("[data-hero-line]");
    const eyebrow = scope.querySelector<HTMLElement>("[data-hero-eyebrow]");
    const subtitle = scope.querySelector<HTMLElement>("[data-hero-sub]");
    const cta = scope.querySelector<HTMLElement>("[data-hero-cta]");

    const tween = gsap.timeline();

    if (bg) {
      tween.fromTo(
        bg,
        { scale: 1.12 },
        { scale: 1, duration: 1.6, ease: "power2.out" },
        0,
      );
    }

    if (eyebrow) {
      tween.fromTo(
        eyebrow,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.7 },
        0.2,
      );
    }

    if (headline.length > 0) {
      tween.fromTo(
        headline,
        { autoAlpha: 0, y: 44 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
        },
        0.2,
      );
    }

    if (subtitle) {
      tween.fromTo(
        subtitle,
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 0.8 },
        0.5,
      );
    }

    if (cta) {
      tween.fromTo(
        cta,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.8 },
        0.7,
      );
    }

    const content = scope.querySelector<HTMLElement>("[data-hero-content]");
    if (content && bg) {
      const factor = isMobileViewport() ? 0.4 : 1;
      gsap.to(bg, {
        yPercent: -10 * factor,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: scope,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(content, {
        yPercent: -6 * factor,
        autoAlpha: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger: scope,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }

    return () => {
      tween.kill();
      gsap.killTweensOf([bg, content]);
    };
  }, [reduced]);

  return scopeRef;
}