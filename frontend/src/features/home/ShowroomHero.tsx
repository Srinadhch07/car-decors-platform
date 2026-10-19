import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container } from "../../components/ui";
import { useHeroAnimation } from "../../lib/motion";
import { useShopSettings } from "../../context/ShopSettingsContext";
import { FALLBACK_BRAND } from "../../lib/seo";
import {
  HeroContours,
  HeroDriftParticles,
  HeroFineLines,
  HeroGeometricRings,
  HeroLightSweep,
} from "./HeroDecor";

const HERO_IMAGE = {
  src: "/images/showroom/hero-showroom.jpg",
  width: 1600,
  height: 1065,
};

/**
 * Homepage hero.
 *
 * The full business name (from admin shop settings) is the primary headline,
 * animated word-by-word over a refined showroom backdrop with layered 2D
 * decoration and scroll parallax. The name is intentionally rendered here — not
 * in the shared header.
 */
export function ShowroomHero() {
  const scopeRef = useHeroAnimation<HTMLElement>();
  const { data: shop } = useShopSettings();

  const brandName = shop?.shop_name?.trim() || FALLBACK_BRAND;
  const words = brandName.split(/\s+/).filter(Boolean);

  return (
    <section
      ref={scopeRef}
      className="relative overflow-hidden bg-dark-900 text-white"
    >
      <div data-hero-media className="absolute inset-0 will-change-transform">
        <img
          src={HERO_IMAGE.src}
          alt=""
          aria-hidden="true"
          width={HERO_IMAGE.width}
          height={HERO_IMAGE.height}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950/95 via-dark-900/85 to-dark-900/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/90 via-transparent to-dark-950/40" />
      </div>

      {/* Layered decorative motion (parallax via useHeroAnimation) */}
      <div data-hero-decor aria-hidden="true" className="absolute inset-0 overflow-hidden will-change-transform">
        <HeroFineLines className="inset-0 opacity-40 mix-blend-soft-light" />
        <HeroContours className="inset-x-0 top-0 h-2/3 w-full opacity-50" />
        <HeroGeometricRings className="right-[-4rem] top-1/2 hidden h-[28rem] w-[28rem] -translate-y-1/2 md:block" />
        <HeroDriftParticles className="inset-0" />
        <HeroLightSweep className="inset-0" />
      </div>

      <Container className="relative z-10 flex min-h-[74vh] flex-col justify-center py-20 sm:min-h-[78vh] sm:py-24 lg:min-h-[84vh]">
        <div data-hero-content className="max-w-3xl">
          <p
            data-hero-eyebrow
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-xs"
          >
            Car Accessories &amp; Decor
          </p>

          <h1
            aria-label={brandName}
            className="text-[clamp(2.3rem,1.1rem+4.4vw,4.75rem)] font-bold leading-[1.04] tracking-tight text-white"
          >
            {words.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                {index > 0 ? " " : null}
                <span data-hero-line className="inline-block">
                  {word}
                </span>
              </Fragment>
            ))}
          </h1>

          <span
            data-hero-line
            aria-hidden="true"
            className="mt-5 block h-1 w-24 rounded-full bg-gradient-to-r from-orange-500 to-orange-500/0"
          />

          <p
            data-hero-sub
            className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg"
          >
            Make every drive feel special with premium car accessories and
            décor, fitted for your car.
          </p>

          <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800 sm:text-base"
            >
              Explore Products
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:text-base"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </Container>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-600/50 to-transparent" />
    </section>
  );
}
