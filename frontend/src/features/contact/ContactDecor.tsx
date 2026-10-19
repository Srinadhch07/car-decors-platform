/**
 * Decorative 2D pieces for the Contact page.
 *
 * Every element is purely presentational: `aria-hidden`, `pointer-events:none`
 * and colours derived from the active theme (orange-* / --theme-* tokens). The
 * paired `.contact-*` rules in styles/index.css neutralise all motion when the
 * user prefers reduced motion, leaving the static linework in place.
 */

/** 1 — Flowing contour linework behind the hero. */
export function HeroContours({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 600 400"
        className="h-full w-full text-orange-500/25"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M-20 90 C 120 40, 240 170, 380 110 S 620 70, 660 130"
          stroke="currentColor"
          strokeWidth="1.4"
          className="contact-dash"
        />
        <path
          d="M-20 160 C 140 100, 245 230, 395 160 S 630 130, 660 200"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
        <path
          d="M-20 235 C 140 175, 250 300, 400 235 S 630 200, 660 260"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.4"
        />
        <path
          d="M-20 310 C 130 260, 240 360, 400 300 S 630 270, 660 330"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.25"
        />
      </svg>
    </div>
  );
}

const HERO_PARTICLES = [
  { left: "8%", top: "22%", size: 6, delay: "0s", duration: "18s" },
  { left: "26%", top: "58%", size: 4, delay: "2.4s", duration: "21s" },
  { left: "44%", top: "18%", size: 3, delay: "4.2s", duration: "19s" },
  { left: "62%", top: "62%", size: 5, delay: "1.2s", duration: "23s" },
  { left: "80%", top: "28%", size: 4, delay: "3.1s", duration: "20s" },
  { left: "92%", top: "70%", size: 3, delay: "5s", duration: "22s" },
];

/** Hero drifting particles, echoing the About page's ambient motion. */
export function HeroParticles({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      {HERO_PARTICLES.map((p, index) => (
        <span
          key={index}
          className="contact-particle contact-drift"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

/** Animated horizontal line motif that anchors the hero to the next section. */
export function HeroLineMotif({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        className="h-full w-full text-orange-500/40"
        fill="none"
      >
        <line x1="0" y1="20" x2="1200" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="0" y1="20" x2="1200" y2="20" stroke="currentColor" strokeWidth="1.5" className="contact-dash" />
        <circle cx="600" cy="20" r="3.5" fill="currentColor" className="contact-pulse" />
      </svg>
    </div>
  );
}

/** Rotating dashed rings placed behind a quick-contact icon. */
export function OptionIconRings({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`contact-decor ${className}`}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="30"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 8"
        className="contact-spin"
      />
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 10"
        opacity="0.6"
        className="contact-spin-rev"
      />
    </svg>
  );
}

const OPTION_ACCENTS = [
  { left: "6%", top: "14%", size: 60, radius: "50%", delay: "0s", duration: "14s" },
  { left: "88%", top: "26%", size: 44, radius: "1rem", delay: "3s", duration: "17s" },
  { left: "72%", top: "78%", size: 72, radius: "50%", delay: "1.5s", duration: "20s" },
  { left: "16%", top: "82%", size: 38, radius: "1rem", delay: "4.5s", duration: "16s" },
];

/** Soft floating shapes that give the quick-contact band depth. */
export function OptionAccents({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      {OPTION_ACCENTS.map((accent, index) => (
        <span
          key={index}
          className="contact-shape contact-float"
          style={{
            left: accent.left,
            top: accent.top,
            width: accent.size,
            height: accent.size,
            borderRadius: accent.radius,
            animationDelay: accent.delay,
            animationDuration: accent.duration,
          }}
        />
      ))}
    </div>
  );
}

/** Slowly drifting two-tone gradient behind the enquiry panel. */
export function EnquiryGradient({ className = "" }: { className?: string }) {
  return <div className={`contact-decor contact-gradient ${className}`} aria-hidden="true" />;
}

/** Fine-line texture with a gentle opacity pulse. */
export function EnquiryFineLines({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      <div className="contact-lines contact-pulse h-full w-full" />
    </div>
  );
}

/** Concentric rings around the location panel. */
export function LocationRings({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="h-full w-full text-orange-500/30" fill="none">
        <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" strokeDasharray="2 9" className="contact-spin" />
        <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" strokeDasharray="12 8" className="contact-spin-rev" />
        <circle cx="100" cy="100" r="46" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}

/** Abstract road/route line that animates across the location section. */
export function RouteLines({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
        className="h-full w-full text-orange-500/30"
        fill="none"
      >
        <path
          d="M18 268 C 88 186, 118 226, 176 152 S 300 58, 384 92"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.35"
        />
        <path
          d="M18 268 C 88 186, 118 226, 176 152 S 300 58, 384 92"
          stroke="currentColor"
          strokeWidth="1.5"
          className="contact-route"
        />
        <circle cx="18" cy="268" r="4" fill="currentColor" />
        <circle cx="176" cy="152" r="4" fill="currentColor" className="contact-pulse" />
        <circle cx="384" cy="92" r="5" fill="currentColor" />
      </svg>
    </div>
  );
}

/** Diagonal light sweep across the closing call-to-action. */
export function LightSweep({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor overflow-hidden ${className}`} aria-hidden="true">
      <div
        className="contact-sweep absolute inset-y-0 w-1/3"
        style={{
          left: "-33%",
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-primary) 22%, transparent), transparent)",
        }}
      />
    </div>
  );
}

/** Thin animated divider used between the page sections. */
export function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`contact-decor ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className="h-full w-full text-orange-500/40"
        fill="none"
      >
        <line x1="0" y1="12" x2="1200" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.28" />
        <line x1="0" y1="12" x2="1200" y2="12" stroke="currentColor" strokeWidth="1.4" className="contact-dash-slow" />
      </svg>
    </div>
  );
}
