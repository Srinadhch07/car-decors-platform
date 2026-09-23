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

      <Container className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center py-16 text-center sm:min-h-[65vh] lg:min-h-[70vh] lg:py-20">
        <div data-hero-content className="flex flex-col items-center">
          {/* Eyebrow */}
          <p
            data-hero-eyebrow
            className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-sm"
          >
            Drive in Style
          </p>

          {/* Headline (line-by-line reveal) */}
          <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
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
            className="mt-5 max-w-lg text-sm leading-relaxed text-gray-400 sm:text-base"
          >
            Quality accessories and car decor solutions for comfort, style and value.
          </p>

          {/* CTA */}
          <div data-hero-cta className="mt-8 w-full px-2 sm:px-0">
            <HeroSearch />
          </div>
        </div>
      </Container>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-600/50 to-transparent" />
    </section>
  );
}