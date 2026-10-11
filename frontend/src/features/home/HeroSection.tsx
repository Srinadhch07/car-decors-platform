import { Container } from "../../components/ui";
import { HeroSearch } from "./HeroSearch";
import { useHeroAnimation } from "../../lib/motion";

export function HeroSection() {
  const scopeRef = useHeroAnimation();

  return (
    <section ref={scopeRef} className="relative overflow-hidden bg-dark-900 text-white">
      {/* Background media (parallax + entrance zoom) */}
      <div data-hero-media className="absolute inset-0 will-change-transform">
        <img
          src="/images/hero-bg.svg"
          alt=""
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950/90 via-dark-900/80 to-dark-900/60" />
      </div>

      <Container className="relative z-10 flex min-h-[52vh] flex-col items-center justify-center py-14 text-center sm:min-h-[58vh] sm:py-16 lg:min-h-[62vh] lg:py-20">
        <div data-hero-content className="flex flex-col items-center">
          {/* Eyebrow */}
          <p
            data-hero-eyebrow
            className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:mb-4 sm:text-sm"
          >
            Drive in Style
          </p>

          {/* Headline (line-by-line reveal) */}
          <h1 className="max-w-3xl text-[clamp(1.5rem,1rem+2.6vw,3.75rem)] font-bold leading-tight tracking-tight">
            <span data-hero-line className="block">
              Premium Car Decors
            </span>
            <span data-hero-line className="block text-orange-500">
              for a Better Journey
            </span>
          </h1>

          {/* Supporting text */}
          <p
            data-hero-sub
            className="mt-3 max-w-lg text-sm leading-relaxed text-gray-400 sm:mt-5 sm:text-base"
          >
            Quality accessories and car decor solutions for comfort, style and value.
          </p>

          {/* CTA */}
          <div data-hero-cta className="mt-6 w-full px-2 sm:mt-8 sm:px-0">
            <HeroSearch />
          </div>
        </div>
      </Container>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-600/50 to-transparent" />

      {/* Lightweight automotive deco — desktop only, decorative, behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-6 hidden lg:block"
      >
        <div
          className="animate-lane-flow absolute bottom-0 left-0 right-0 h-0.5 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0 14px, transparent 14px 28px)",
          }}
        />
        <svg
          className="animate-car-drive absolute bottom-[-2px] w-24 text-white/15"
          viewBox="0 0 120 42"
          fill="none"
        >
          <path
            d="M13 33 C11 30 11 26 12 23 C13 18 18 15 23 15 L31 15 C37 8 47 5 58 5 L64 5 C76 5 87 8 95 15 L103 15 C109 15 112 19 112 25 C112 31 107 34 101 34 Z"
            fill="currentColor"
          />
          <circle cx="29" cy="32" r="5.5" fill="#0a0a0a" />
          <circle cx="90" cy="32" r="5.5" fill="#0a0a0a" />
        </svg>
      </div>
    </section>
  );
}