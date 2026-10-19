import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container } from "../../components/ui";
import { useHeroAnimation } from "../../lib/motion";
import { useShopSettings } from "../../context/ShopSettingsContext";
import { BUSINESS_NAME, EXPERIENCE_YEARS, LOCATION } from "./aboutContent";
import { ContourLines, DriftParticles } from "./AboutDecor";

/** Section A — immersive editorial hero introducing the story. */
export function AboutHero() {
  const scopeRef = useHeroAnimation<HTMLElement>();
  const { data: shop } = useShopSettings();

  const brand = shop?.shop_name?.trim() || BUSINESS_NAME;

  return (
    <section
      ref={scopeRef}
      className="relative overflow-hidden bg-dark-900 text-white"
    >
      <div data-hero-media className="absolute inset-0 will-change-transform">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        <ContourLines className="inset-x-0 top-0 h-2/3 w-full opacity-70" />
        <DriftParticles className="inset-0" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 20% 15%, color-mix(in srgb, var(--theme-primary) 22%, transparent), transparent 70%)",
          }}
        />
      </div>

      <Container className="relative z-10 flex min-h-[58vh] flex-col justify-center py-20 sm:min-h-[64vh] sm:py-24 lg:min-h-[70vh]">
        <div className="max-w-3xl">
          <p
            data-hero-eyebrow
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-xs"
          >
            {shop?.logo_url ? (
              <img
                src={shop.logo_url}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 rounded-sm object-contain"
              />
            ) : null}
            {LOCATION} · {EXPERIENCE_YEARS} Years
          </p>

          <h1 className="text-[clamp(2.1rem,1.2rem+3.8vw,4.25rem)] font-bold leading-[1.05] tracking-tight">
            <span data-hero-line className="block">
              {EXPERIENCE_YEARS} Years of
            </span>
            <span data-hero-line className="block text-orange-500">
              Passion for Cars.
            </span>
          </h1>

          <p
            data-hero-sub
            className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg"
          >
            {brand} has spent {EXPERIENCE_YEARS} years around cars, accessories
            and the people who love them — helping every driver add a personal
            touch to the road.
          </p>

          <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#our-story"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800 sm:text-base"
            >
              Our Story
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
            >
              Explore Products
            </Link>
          </div>
        </div>
      </Container>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
      />
    </section>
  );
}
