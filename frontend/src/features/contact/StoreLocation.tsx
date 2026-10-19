import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { STORE_HEADING, STORE_SUPPORT } from "./contactContent";
import { LocationRings, RouteLines } from "./ContactDecor";

/** Section D — store location and directions. */
export function StoreLocation() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", { y: 30, stagger: 0.1, start: "top 84%" });

  const hasAddress = hasContent(shop?.address);
  const hasPhone = hasContent(shop?.phone);
  const hasEmail = hasContent(shop?.email);
  const hasHours = hasContent(shop?.business_hours);
  const hasWhatsApp = hasContent(shop?.whatsapp_number);

  if (!hasAddress && !hasPhone && !hasEmail && !hasHours) return null;

  const directionsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop!.address)}`
    : null;

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface-muted">
      <RouteLines className="inset-0 hidden lg:block" />

      <Container className="relative z-10">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div data-reveal>
            <span className="eyebrow">Find Us</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              {STORE_HEADING}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
              {STORE_SUPPORT}
            </p>

            <div className="mt-8 space-y-5">
              {hasAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Address</p>
                    <p className="text-sm text-text-secondary">{shop!.address}</p>
                  </div>
                </div>
              )}

              {hasHours && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Business Hours</p>
                    <p className="text-sm text-text-secondary">{shop!.business_hours}</p>
                  </div>
                </div>
              )}

              {hasPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Phone</p>
                    <a
                      href={`tel:${shop!.phone}`}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      {shop!.phone}
                    </a>
                  </div>
                </div>
              )}

              {hasEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Email</p>
                    <a
                      href={`mailto:${shop!.email}`}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      {shop!.email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            data-reveal
            className="relative min-h-[22rem] overflow-hidden rounded-2xl border border-border-light bg-surface p-8"
          >
            <div className="contact-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <LocationRings className="inset-0 m-auto h-72 w-72 opacity-70" />

            <div className="relative flex h-full min-h-[18rem] flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-orange-600/10 text-orange-600">
                <MapPin className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-text-primary">
                {shop?.shop_name || "Our Showroom"}
              </p>
              {hasAddress && (
                <p className="mt-1 max-w-xs text-sm text-text-secondary">{shop!.address}</p>
              )}

              <div className="mt-5 flex flex-col items-center gap-3">
                {directionsUrl && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800"
                  >
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    Get Directions
                  </a>
                )}
                {hasWhatsApp && (
                  <a
                    href={buildWhatsAppUrl(shop!.whatsapp_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Chat on WhatsApp
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
