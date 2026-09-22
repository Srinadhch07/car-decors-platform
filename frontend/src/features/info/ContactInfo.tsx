import { MapPin, Phone, Mail, Clock, MessageCircle, ExternalLink } from "lucide-react";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";

const socialLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
};

export function ContactInfo() {
  const { data: shop, loading } = useShopSettings();

  if (loading || !shop) return null;

  const whatsappUrl = shop.whatsapp_number
    ? buildWhatsAppUrl(shop.whatsapp_number)
    : null;

  const socialEntries = Object.entries(shop.social_links ?? {}).filter(
    ([platform, url]) => socialLabels[platform] && hasContent(url),
  );

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      {/* Contact details */}
      <div>
        <h2 className="mb-1 text-xl font-bold text-text-primary sm:text-2xl">
          Get in Touch
        </h2>
        <p className="mb-6 text-sm text-text-secondary">
          {shop.shop_name || "Our shop"}
        </p>
        <div className="space-y-5">
          {shop.address && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Address</p>
                <p className="text-sm text-text-secondary">{shop.address}</p>
              </div>
            </div>
          )}

          {shop.phone && (
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Phone</p>
                <a
                  href={`tel:${shop.phone}`}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  {shop.phone}
                </a>
              </div>
            </div>
          )}

          {shop.email && (
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Email</p>
                <a
                  href={`mailto:${shop.email}`}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  {shop.email}
                </a>
              </div>
            </div>
          )}

          {shop.business_hours && (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Business Hours</p>
                <p className="text-sm text-text-secondary">{shop.business_hours}</p>
              </div>
            </div>
          )}

          {socialEntries.length > 0 && (
            <div className="pt-2">
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
                    {socialLabels[platform]}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-border-light bg-surface-muted p-8 text-center">
        <MessageCircle className="mb-4 h-12 w-12 text-orange-600" />
        <h3 className="mb-2 text-lg font-bold text-text-primary">
          Chat on WhatsApp
        </h3>
        <p className="mb-6 max-w-sm text-sm text-text-secondary">
          Have a question about our products or services? Send us a message on WhatsApp for a quick response.
        </p>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Start Chat
          </a>
        )}
      </div>
    </div>
  );
}
