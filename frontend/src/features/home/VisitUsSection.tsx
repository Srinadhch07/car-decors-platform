import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { Container } from "../../components/ui";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { useScrollReveal } from "../../lib/motion";

export function VisitUsSection() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 36,
    stagger: 0.1,
    start: "top 88%",
  });

  const hasPhone = hasContent(shop?.phone);
  const hasEmail = hasContent(shop?.email);
  const hasAddress = hasContent(shop?.address);
  const hasHours = hasContent(shop?.business_hours);
  const hasWhatsApp = hasContent(shop?.whatsapp_number);

  if (!hasPhone && !hasEmail && !hasAddress && !hasWhatsApp) return null;

  const directionsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop!.address)}`
    : null;

  return (
    <section ref={scopeRef} className="section-y bg-surface-muted">
      <Container>
        <div data-reveal className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-500 sm:text-sm">
            Visit Us
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Come See Us in Person
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Location + hours */}
          <div data-reveal className="card-surface p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-text-primary">Store Details</h3>
            <div className="mt-5 space-y-5">
              {hasAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Address</p>
                    <p className="text-sm text-text-secondary">{shop!.address}</p>
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
                      >
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                        Get directions
                      </a>
                    )}
                  </div>
                </div>
              )}

              {hasHours && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Business Hours</p>
                    <p className="text-sm text-text-secondary">{shop!.business_hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact actions */}
          <div data-reveal className="card-surface relative overflow-hidden p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-600/60 to-transparent"
            />
            <h3 className="text-lg font-semibold text-text-primary">
              Get in Touch
            </h3>
            <p className="mt-3 max-w-md text-sm text-text-secondary sm:text-base">
              Questions about a product or fitment? Reach out and we'll help you find the right fit.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {hasWhatsApp && (
                <a
                  href={buildWhatsAppUrl(shop!.whatsapp_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Chat on WhatsApp
                </a>
              )}
              <div className="flex flex-wrap gap-3">
                {hasPhone && (
                  <a
                    href={`tel:${shop!.phone}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Call Us
                  </a>
                )}
                {hasEmail && (
                  <a
                    href={`mailto:${shop!.email}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Email Us
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
