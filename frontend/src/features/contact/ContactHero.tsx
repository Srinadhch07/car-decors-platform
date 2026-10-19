import { ArrowRight, MessageCircle } from "lucide-react";
import { Container } from "../../components/ui";
import { useHeroAnimation } from "../../lib/motion";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { HERO_HEADING_ACCENT, HERO_HEADING_LEAD, HERO_SUPPORT } from "./contactContent";
import { HeroContours, HeroLineMotif, HeroParticles } from "./ContactDecor";

/** Section 1 — immersive hero that opens the contact experience. */
export function ContactHero() {
  const scopeRef = useHeroAnimation<HTMLElement>();
  const { data: shop } = useShopSettings();

  const hasWhatsApp = hasContent(shop?.whatsapp_number);

  return (
    <section ref={scopeRef} className="relative overflow-hidden bg-dark-900 text-white">
      <div data-hero-media className="absolute inset-0 will-change-transform">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
        <HeroContours className="inset-x-0 top-0 h-2/3 w-full opacity-70" />
        <HeroParticles className="inset-0" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 18% 15%, color-mix(in srgb, var(--theme-primary) 22%, transparent), transparent 70%)",
          }}
        />
      </div>

      <Container className="relative z-10 flex min-h-[50vh] flex-col justify-center py-20 sm:min-h-[56vh] sm:py-24">
        <div className="max-w-2xl">
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
            Contact Us
          </p>

          <h1 className="text-[clamp(2.1rem,1.2rem+3.8vw,4.25rem)] font-bold leading-[1.05] tracking-tight">
            <span data-hero-line className="block">
              {HERO_HEADING_LEAD}
            </span>
            <span data-hero-line className="block text-orange-500">
              {HERO_HEADING_ACCENT}
            </span>
          </h1>

          <p
            data-hero-sub
            className="mt-5 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg"
          >
            {HERO_SUPPORT}
          </p>

          <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#enquiry"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800 sm:text-base"
            >
              Send an Enquiry
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {hasWhatsApp && (
              <a
                href={buildWhatsAppUrl(shop!.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp Us
              </a>
            )}
          </div>
        </div>
      </Container>

      <HeroLineMotif className="inset-x-0 bottom-0 h-8 w-full opacity-80" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"
      />
    </section>
  );
}
