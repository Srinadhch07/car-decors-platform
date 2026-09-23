export function isTestEnvironment(): boolean {
  if (import.meta.env?.MODE === "test") return true;
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return true;
  return false;
}

export function supportsReducedMotionQuery(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

export function prefersReducedMotion(): boolean {
  if (!supportsReducedMotionQuery()) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canAnimate(): boolean {
  if (typeof window === "undefined") return false;
  if (isTestEnvironment()) return false;
  if (prefersReducedMotion()) return false;
  return true;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}