import { Phone, Mail, MessageCircle } from "lucide-react";
import { Container } from "../../components/ui";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { useScrollReveal } from "../../lib/motion";

export function ContactCTA() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 40,
    stagger: 0.1,
    start: "top 88%",
  });

  const hasPhone = hasContent(shop?.phone);
  const hasEmail = hasContent(shop?.email);
  const hasWhatsApp = hasContent(shop?.whatsapp_number);

  if (!hasPhone && !hasEmail && !hasWhatsApp) return null;

  return (
    <section ref={scopeRef} className="section-y bg-surface-muted">
      <Container>
        <div
          data-reveal
          className="card-surface relative overflow-hidden p-8 text-center sm:p-10"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-600/60 to-transparent"
          />
          <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            Ready to Upgrade Your Ride?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary sm:text-base">
            Get in touch with us for the best car accessories and decor solutions.
          </p>

          <div data-reveal className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasWhatsApp && (
              <a
                href={buildWhatsAppUrl(shop!.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Us
              </a>
            )}
            {hasPhone && (
              <a
                href={`tel:${shop!.phone}`}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700"
              >
                <Phone className="h-4 w-4" />
                Call Us
              </a>
            )}
            {hasEmail && (
              <a
                href={`mailto:${shop!.email}`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted"
              >
                <Mail className="h-4 w-4" />
                Email Us
              </a>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
