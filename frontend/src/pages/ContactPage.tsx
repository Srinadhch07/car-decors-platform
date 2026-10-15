import { useMemo } from "react";
import { Container, SectionHeading } from "../components/ui";
import { useShopSettings, hasContent } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import {
  DEFAULT_OG_IMAGE,
  FALLBACK_BRAND,
  SITE_URL,
  socialProfileUrls,
  type SeoData,
} from "../lib/seo";
import { ContactInfo } from "../features/info/ContactInfo";

export function ContactPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;
  const description = `Contact ${brand} for car accessories and car decor. Call or WhatsApp us, or visit our shop in Hanamkonda, Telangana.`;

  const jsonLd = useMemo<SeoData["jsonLd"]>(() => {
    const business: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: brand,
      url: `${SITE_URL}/`,
      description,
    };
    if (hasContent(shop?.phone)) business.telephone = shop!.phone.replace(/\s+/g, "");
    if (hasContent(shop?.email)) business.email = shop!.email;
    if (hasContent(shop?.address)) {
      business.address = { "@type": "PostalAddress", streetAddress: shop!.address };
    }
    const sameAs = socialProfileUrls(shop?.social_links);
    if (sameAs.length > 0) business.sameAs = sameAs;
    return [business];
  }, [brand, description, shop]);

  const seo: SeoData = {
    title: `Contact | ${brand}`,
    description,
    canonicalPath: "/contact",
    siteName: brand,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd,
  };

  return (
    <section className="min-h-screen">
      <SeoHead data={seo} />
      {/* Page banner */}
      <section className="page-banner border-b border-dark-700">
        <div className="absolute inset-0 carbon-texture" aria-hidden="true" />
        <Container className="relative py-12 sm:py-16">
          <SectionHeading
            title="Contact Us"
            subtitle="We'd love to hear from you. Get in touch with us."
            centered
            eyebrow="We're Here to Help"
            tone="dark"
            className="mb-0"
          />
        </Container>
      </section>

      <Container className="py-10 sm:py-12">
        <ContactInfo />
      </Container>
    </section>
  );
}