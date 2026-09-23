import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { canAnimate } from "./environment";

let registered = false;

/**
 * Registers ScrollTrigger lazily. Must only run when animations are allowed
 * (real browser, motion permitted) because jsdom has no matchMedia.
 */
export function ensureScrollTrigger() {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger);
}

export function canUseScrollAnimations(): boolean {
  return canAnimate();
}

gsap.defaults({
  ease: "power3.out",
  duration: 0.8,
});

export { gsap, ScrollTrigger };