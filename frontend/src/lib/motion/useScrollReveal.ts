import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, ensureScrollTrigger } from "./gsapSetup";
import { canAnimate } from "./environment";
import { useReducedMotion } from "./useReducedMotion";

export interface RevealVars {
  /** Initial translateY of hidden state (default 40). */
  y?: number;
  /** Initial translateX of hidden state (default 0). */
  x?: number;
  /** Hidden opacity 0..1 (default 0). */
  opacity?: number;
  /** Final scale to settle at (default 1). */
  scale?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  once?: boolean;
  /** Selector for inner media element revealed via clip-path + scale. */
  mediaSelector?: string;
  /** Selector for inner image to scale 1.12 → 1 inside the media element. */
  imgSelector?: string;
  /** Selector for the caption/title element raised from below. */
  captionSelector?: string;
  /** Initial scale for the inner image (default 1.12). */
  imgScale?: number;
}

/**
 * Reveals elements matching `selector` inside `scopeRef` as they enter the
 * viewport. Elements are hidden in a layout effect (pre-paint, so no flash),
 * then animated to visible on first enter. Returns the scope ref to attach.
 *
 * When `prefers-reduced-motion` is active or in test environments, elements are
 * left fully visible and no animation runs.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(selector = "[data-reveal]", vars: RevealVars = {}) {
  const scopeRef = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    const targets = scope?.querySelectorAll<HTMLElement>(selector);
    if (!scope || !targets || targets.length === 0) return;
    if (reduced) return;
    if (!canAnimate()) return;

    const context = gsap.context(() => {
      gsap.set(targets, {
        y: vars.y ?? 40,
        x: vars.x ?? 0,
        autoAlpha: vars.opacity ?? 0,
        force3D: true,
      });

      ensureScrollTrigger();
      ScrollTrigger.batch(targets as unknown as Element[], {
        start: vars.start ?? "top 88%",
        once: vars.once ?? true,
        onEnter: (batch) => {
          gsap.to(batch, {
            y: 0,
            x: 0,
            autoAlpha: 1,
            scale: vars.scale ?? 1,
            duration: vars.duration ?? 0.9,
            stagger: vars.stagger ?? 0.12,
            ease: "power3.out",
            clearProps: "transform,opacity",
          });
        },
      });
    }, scope);

    return () => {
      context.revert();
    };
  }, [selector, vars.y, vars.x, vars.opacity, vars.scale, vars.duration, vars.stagger, vars.start, vars.once, reduced]);

  return scopeRef;
}

/**
 * Cinematic editorial reveal: media clipped open from the bottom while the
 * inner image scales 1.12 → 1 and the caption/card title slides up 40px → 0,
 * staggered across all targets. Requires the scope to contain elements matched
 * by `selector` exposing the optional sub-elements found via the vars.
 */
export function useMediaReveal<T extends HTMLElement = HTMLElement>(selector = "[data-media-reveal]", vars: RevealVars = {}) {
  const scopeRef = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    const targets = scope?.querySelectorAll<HTMLElement>(selector);
    if (!scope || !targets || targets.length === 0) return;
    if (reduced) return;
    if (!canAnimate()) return;

    const context = gsap.context(() => {
      targets.forEach((target) => {
        const media = vars.mediaSelector
          ? target.querySelector<HTMLElement>(vars.mediaSelector)
          : target;
        const img =
          vars.imgSelector && media
            ? media.querySelector<HTMLElement>(vars.imgSelector)
            : media;
        const caption = vars.captionSelector
          ? target.querySelector<HTMLElement>(vars.captionSelector)
          : null;

        if (media) {
          gsap.set(media, {
            clipPath: "inset(0 0 100% 0 round 12px)",
          });
        }
        if (img) {
          gsap.set(img, { scale: vars.imgScale ?? 1.12, transformOrigin: "center 40%" });
        }
        if (caption) {
          gsap.set(caption, { y: 40, autoAlpha: 0 });
        }
      });

      ensureScrollTrigger();
      ScrollTrigger.batch(targets as unknown as Element[], {
        start: vars.start ?? "top 80%",
        once: vars.once ?? true,
        onEnter: (batch) => {
          batch.forEach((target, index) => {
            const el = target as HTMLElement;
            const media = vars.mediaSelector
              ? el.querySelector<HTMLElement>(vars.mediaSelector)
              : el;
            const img =
              vars.imgSelector && media
                ? media.querySelector<HTMLElement>(vars.imgSelector)
                : media;
            const caption = vars.captionSelector
              ? el.querySelector<HTMLElement>(vars.captionSelector)
              : null;

            const delay = (vars.stagger ?? 0.12) * index;
            if (media) {
              gsap.to(media, {
                clipPath: "inset(0 0 0% 0 round 12px)",
                duration: (vars.duration ?? 0.9) + 0.3,
                ease: "power3.inOut",
                delay,
              });
            }
            if (img) {
              gsap.to(img, {
                scale: 1,
                duration: vars.duration ?? 1.1,
                ease: "power2.out",
                delay: delay + 0.1,
                clearProps: "transform",
              });
            }
            if (caption) {
              gsap.to(caption, {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                ease: "power3.out",
                delay: delay + 0.2,
                clearProps: "transform",
              });
            }
          });
        },
      });
    }, scope);

    return () => {
      context.revert();
    };
  }, [selector, vars.mediaSelector, vars.imgSelector, vars.captionSelector, vars.imgScale, vars.duration, vars.stagger, vars.start, vars.once, reduced]);

  return scopeRef;
}