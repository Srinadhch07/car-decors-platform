import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { CLOSING_HEADING, CLOSING_SUPPORT } from "./contactContent";
import { LightSweep } from "./ContactDecor";

/** Section F — closing call to action. */
export function ClosingCta() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", { y: 26, start: "top 88%" });

  const hasWhatsApp = hasContent(shop?.whatsapp_number);
  const hasPhone = hasContent(shop?.phone);

  return (
    <section
      ref={scopeRef}
      className="relative overflow-hidden bg-dark-900 py-20 text-white sm:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950"
      />
      <LightSweep className="inset-0" />

      <Container className="relative z-10">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{CLOSING_HEADING}</h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-300 sm:text-base">
            {CLOSING_SUPPORT}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800 sm:text-base"
            >
              Explore Products
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            {hasWhatsApp ? (
              <a
                href={buildWhatsAppUrl(shop!.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp Us
              </a>
            ) : hasPhone ? (
              <a
                href={`tel:${shop!.phone}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call Us
              </a>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
