import type { CSSProperties } from "react";

/**
 * About page decorative motion family.
 *
 * Twelve lightweight, theme-aware 2D effects built from inline SVG and CSS
 * (no images, no WebGL, no remote assets). Every piece is purely decorative:
 * it is `aria-hidden`, ignores pointer events, and is neutralised by the global
 * `prefers-reduced-motion` rule in `styles/index.css` so content stays readable.
 */

interface DecorProps {
  className?: string;
}

/** A. Slow topographic contour lines that drift across the hero. */
export function ContourLines({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 600 400" className="h-full w-full text-orange-500/25" fill="none" preserveAspectRatio="none">
        <path d="M-20 110 C 120 50, 240 190, 380 120 S 620 80, 650 150" stroke="currentColor" strokeWidth="1.2" className="about-dash" />
        <path d="M-20 175 C 140 115, 245 250, 395 175 S 630 145, 655 215" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <path d="M-20 240 C 100 200, 255 320, 415 240 S 640 210, 660 280" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M-20 305 C 120 265, 265 385, 435 305 S 645 280, 665 350" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      </svg>
    </div>
  );
}

/** B. Floating particles that drift with varied timing. */
const PARTICLES = [
  { left: "8%", top: "26%", size: 5, delay: "0s", duration: "15s" },
  { left: "22%", top: "64%", size: 3, delay: "1.4s", duration: "18s" },
  { left: "41%", top: "18%", size: 4, delay: "2.6s", duration: "16s" },
  { left: "63%", top: "56%", size: 6, delay: "0.8s", duration: "20s" },
  { left: "78%", top: "30%", size: 3, delay: "3.1s", duration: "17s" },
  { left: "90%", top: "70%", size: 4, delay: "2s", duration: "19s" },
];

export function DriftParticles({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="about-particle about-drift"
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

/** C. Concentric rings rotating in opposite directions behind the milestone. */
export function OrbitRings({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full text-orange-500/30" fill="none">
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="2 9" className="about-spin" />
        <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" strokeDasharray="12 8" className="about-spin-rev" />
        <circle cx="100" cy="100" r="46" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}

/** D. A travelling dashed timeline line. */
export function TimelineFlow({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 800 40" className="h-full w-full text-orange-500/40" fill="none" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="800" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <line x1="0" y1="20" x2="800" y2="20" stroke="currentColor" strokeWidth="1.4" className="about-dash" />
      </svg>
    </div>
  );
}

/** E. Flowing editorial curves behind the story. */
export function FlowCurves({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 600 400" className="h-full w-full text-orange-500/20" fill="none" preserveAspectRatio="none">
        <path d="M-20 90 C 140 30, 260 160, 400 90 S 620 60, 640 130" stroke="currentColor" strokeWidth="1.2" className="about-dash-slow" />
        <path d="M-20 210 C 160 150, 280 290, 430 210 S 620 170, 640 250" stroke="currentColor" strokeWidth="1" opacity="0.55" className="about-float" />
        <path d="M-20 330 C 140 280, 290 400, 440 330 S 620 300, 640 370" stroke="currentColor" strokeWidth="1" opacity="0.32" />
      </svg>
    </div>
  );
}

/** F. Floating light shards. */
const SHARDS = [
  { left: "10%", top: "30%", width: 90, rotate: "-18deg", delay: "0s", duration: "13s" },
  { left: "62%", top: "22%", width: 120, rotate: "12deg", delay: "1.2s", duration: "16s" },
  { left: "30%", top: "72%", width: 70, rotate: "6deg", delay: "2.4s", duration: "15s" },
  { left: "78%", top: "60%", width: 100, rotate: "-9deg", delay: "0.6s", duration: "18s" },
];

export function LineShards({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      {SHARDS.map((s, i) => (
        <span
          key={i}
          className="about-decor"
          style={{ left: s.left, top: s.top, transform: `rotate(${s.rotate})` }}
        >
          <span
            className="about-shard about-float"
            style={{ width: s.width, animationDelay: s.delay, animationDuration: s.duration }}
          />
        </span>
      ))}
    </div>
  );
}

/** G. Slowly rotating outline geometry for the owner composition. */
export function OutlineGeometry({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full text-orange-500/25" fill="none">
        <polygon points="100,8 181,54 181,146 100,192 19,146 19,54" stroke="currentColor" strokeWidth="1" className="about-spin-rev" />
        <rect x="52" y="52" width="96" height="96" stroke="currentColor" strokeWidth="1" opacity="0.5" className="about-spin" />
        <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </svg>
    </div>
  );
}

/** H. Angular tick pattern that rotates a ring of marks. */
const TICKS = Array.from({ length: 24 }, (_, i) => i);

export function AngularPattern({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full text-orange-500/25" fill="none">
        {TICKS.map((i) => (
          <line
            key={i}
            x1="100"
            y1="12"
            x2="100"
            y2={i % 3 === 0 ? 26 : 20}
            stroke="currentColor"
            strokeWidth="1"
            transform={`rotate(${i * 15} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="86" stroke="currentColor" strokeWidth="1" opacity="0.4" className="about-spin" />
      </svg>
    </div>
  );
}

/** I. A subtly moving perspective grid. */
export function PerspectiveGrid({ className = "" }: DecorProps) {
  const perspective: CSSProperties = {
    transform: "perspective(600px) rotateX(55deg)",
    transformOrigin: "top center",
  };
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <div className="about-grid about-grid-flow h-full w-full" style={perspective} />
    </div>
  );
}

/** J. Floating geometric shapes behind the offerings. */
const GEOMETRY = [
  { left: "6%", top: "24%", size: 44, radius: "9999px", delay: "0s", duration: "14s" },
  { left: "70%", top: "14%", size: 36, radius: "6px", delay: "1.1s", duration: "17s" },
  { left: "84%", top: "62%", size: 52, radius: "9999px", delay: "2.2s", duration: "19s" },
  { left: "24%", top: "70%", size: 30, radius: "6px", delay: "0.6s", duration: "16s" },
];

export function GeoDrift({ className = "" }: DecorProps) {
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      {GEOMETRY.map((g, i) => (
        <span
          key={i}
          className="about-geo about-float"
          style={{
            left: g.left,
            top: g.top,
            width: g.size,
            height: g.size,
            borderRadius: g.radius,
            animationDelay: g.delay,
            animationDuration: g.duration,
          }}
        />
      ))}
    </div>
  );
}

/** K. Fine pulsing parallel lines behind the approach copy. */
export function FineLines({ className = "" }: DecorProps) {
  const lines: CSSProperties = {
    backgroundImage:
      "repeating-linear-gradient(90deg, color-mix(in srgb, var(--theme-primary) 20%, transparent) 0 1px, transparent 1px 46px)",
  };
  return (
    <div className={`about-decor ${className}`} aria-hidden="true">
      <div className="about-pulse h-full w-full" style={lines} />
    </div>
  );
}

/** L. A soft light sweep across the closing call to action. */
export function LightSweep({ className = "" }: DecorProps) {
  const sweep: CSSProperties = {
    left: "-33%",
    background:
      "linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-accent) 22%, transparent), transparent)",
  };
  return (
    <div className={`about-decor overflow-hidden ${className}`} aria-hidden="true">
      <div className="about-sweep absolute inset-y-0 w-1/3" style={sweep} />
    </div>
  );
}
