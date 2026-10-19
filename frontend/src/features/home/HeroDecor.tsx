import type { CSSProperties } from "react";

/**
 * Homepage hero decorative motion family.
 *
 * Lightweight, theme-aware 2D effects built from inline SVG and CSS only
 * (no images, no WebGL, no remote assets). Every piece is purely decorative:
 * it is `aria-hidden`, ignores pointer events, and is neutralised by the global
 * `prefers-reduced-motion` rule in `styles/index.css`.
 */

interface DecorProps {
  className?: string;
}

/** A. Layered topographic contour lines drifting across the hero. */
export function HeroContours({ className = "" }: DecorProps) {
  return (
    <div className={`showroom-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 600" className="h-full w-full text-orange-500/25" fill="none" preserveAspectRatio="none">
        <path d="M-20 120 C 220 40, 420 240, 660 140 S 1080 80, 1240 180" stroke="currentColor" strokeWidth="1.3" className="showroom-dash" />
        <path d="M-20 220 C 240 140, 460 320, 700 220 S 1100 160, 1240 260" stroke="currentColor" strokeWidth="1" opacity="0.6" className="showroom-float" />
        <path d="M-20 330 C 200 270, 480 430, 720 330 S 1120 280, 1240 380" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M-20 450 C 220 400, 500 540, 760 440 S 1140 400, 1240 500" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      </svg>
    </div>
  );
}

/** B. Concentric geometric rings rotating in opposite directions. */
export function HeroGeometricRings({ className = "" }: DecorProps) {
  return (
    <div className={`showroom-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 240 240" className="h-full w-full text-orange-500/35" fill="none">
        <circle cx="120" cy="120" r="112" stroke="currentColor" strokeWidth="1" strokeDasharray="2 10" className="showroom-spin" />
        <circle cx="120" cy="120" r="86" stroke="currentColor" strokeWidth="1" strokeDasharray="14 10" className="showroom-spin-rev" />
        <circle cx="120" cy="120" r="60" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <polygon
          points="120,26 197,71 197,169 120,214 43,169 43,71"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.45"
          className="showroom-spin-rev"
        />
      </svg>
    </div>
  );
}

/** C. Floating particles that drift with varied timing. */
const PARTICLES = [
  { left: "6%", top: "24%", size: 5, delay: "0s", duration: "16s" },
  { left: "18%", top: "68%", size: 3, delay: "1.4s", duration: "19s" },
  { left: "34%", top: "16%", size: 4, delay: "2.6s", duration: "17s" },
  { left: "52%", top: "58%", size: 3, delay: "0.8s", duration: "21s" },
  { left: "68%", top: "28%", size: 6, delay: "3.1s", duration: "18s" },
  { left: "81%", top: "66%", size: 4, delay: "2s", duration: "20s" },
  { left: "93%", top: "38%", size: 3, delay: "1s", duration: "22s" },
];

export function HeroDriftParticles({ className = "" }: DecorProps) {
  return (
    <div className={`showroom-decor ${className}`} aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="showroom-particle showroom-drift"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

/** D. Fine vertical line pattern that gently pulses. */
export function HeroFineLines({ className = "" }: DecorProps) {
  return <div className={`showroom-decor showroom-lines showroom-pulse ${className}`} aria-hidden="true" />;
}

/** E. Slow diagonal light sweep across the scene. */
export function HeroLightSweep({ className = "" }: DecorProps) {
  const style: CSSProperties = {
    background:
      "linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--theme-primary) 30%, transparent) 50%, transparent 62%)",
  };
  return <div className={`showroom-decor showroom-sweep ${className}`} aria-hidden="true" style={style} />;
}
