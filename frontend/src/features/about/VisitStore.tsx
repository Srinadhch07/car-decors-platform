import { Clock, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { Container } from "../../components/ui";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { ContourLines } from "./AboutDecor";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  twitter: "X",
  linkedin: "LinkedIn",
};

export function VisitStore() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 30,
    stagger: 0.1,
    start: isMobileViewport() ? "top 60%" : "top 84%",
  });

  const hasPhone = hasContent(shop?.phone);
  const hasEmail = hasContent(shop?.email);
  const hasAddress = hasContent(shop?.address);
  const hasWhatsApp = hasContent(shop?.whatsapp_number);

  const socialEntries = Object.entries(shop?.social_links ?? {}).filter(
    ([platform, url]) => SOCIAL_LABELS[platform] && hasContent(url),
  );

  if (!hasPhone && !hasEmail && !hasAddress && !hasWhatsApp && !shop?.business_hours && socialEntries.length === 0) {
    return null;
  }

  const directionsUrl = hasAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop!.address)}`
    : null;

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface-muted">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div data-reveal>
            <span className="eyebrow">Visit Us</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Visit Us in Karimnagar
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
              Prefer to see things in person? Stop by and we will help you find
              the right accessories for your car.
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

              {shop?.business_hours && (
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Business Hours</p>
                    <p className="text-sm text-text-secondary">{shop.business_hours}</p>
                  </div>
                </div>
              )}

              {hasPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Phone</p>
                    <a href={`tel:${shop!.phone}`} className="text-sm text-orange-600 hover:text-orange-700">
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
                    <a href={`mailto:${shop!.email}`} className="text-sm text-orange-600 hover:text-orange-700">
                      {shop!.email}
                    </a>
                  </div>
                </div>
              )}

              {socialEntries.length > 0 && (
                <div className="pt-1">
                  <p className="mb-2 text-sm font-semibold text-text-primary">Follow Us</p>
                  <div className="flex flex-wrap gap-2">
                    {socialEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border-light bg-white px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted"
                      >
                        {SOCIAL_LABELS[platform]}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            data-reveal
            className="relative min-h-[22rem] overflow-hidden rounded-2xl border border-border-light bg-surface p-8"
          >
            <div className="about-grid absolute inset-0 opacity-70" aria-hidden="true" />
            <ContourLines className="inset-0 h-full w-full opacity-60" />

            <div className="relative flex h-full min-h-[18rem] flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-orange-600/10 text-orange-600">
                <MapPin className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-text-primary">
                {shop?.shop_name || "Our Showroom"}
              </p>
              {hasAddress && (
                <p className="mt-1 max-w-xs text-sm text-text-secondary">
                  {shop!.address}
                </p>
              )}
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700"
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
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
