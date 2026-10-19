import { useMemo } from "react";
import { useShopSettings, hasContent } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import {
  DEFAULT_OG_IMAGE,
  FALLBACK_BRAND,
  SITE_URL,
  socialProfileUrls,
  type SeoData,
} from "../lib/seo";
import {
  ClosingCta,
  ContactHero,
  EnquiryComposer,
  QuickContactOptions,
  SocialConnections,
  StoreLocation,
} from "../features/contact";

export function ContactPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;
  const description = `Contact ${brand} for car accessories and car decor. Call or WhatsApp us, or visit our shop in Karimnagar, Telangana.`;

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
    <div>
      <SeoHead data={seo} />
      <ContactHero />
      <QuickContactOptions />
      <EnquiryComposer />
      <StoreLocation />
      <SocialConnections />
      <ClosingCta />
    </div>
  );
}
