import { useMemo } from "react";
import { SeoHead } from "../components/seo";
import { useShopSettings, hasContent } from "../context/ShopSettingsContext";
import {
  DEFAULT_OG_IMAGE,
  FALLBACK_BRAND,
  SITE_URL,
  absoluteUrl,
  socialProfileUrls,
  type SeoData,
} from "../lib/seo";
import {
  HeroSection,
  ValuePropositions,
  CategorySection,
  FeaturedProducts,
  WhyChooseSection,
  ContactCTA,
} from "../features/home";

export function HomePage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;
  const description = `Car accessories and car decor from ${brand} in Hanamkonda, Telangana. Browse seat covers, interior and exterior accessories, and get in touch on WhatsApp.`;

  const jsonLd = useMemo<SeoData["jsonLd"]>(() => {
    const website: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: brand,
      url: `${SITE_URL}/`,
      description,
    };
    const store: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brand,
      url: `${SITE_URL}/`,
      description,
    };
    if (hasContent(shop?.phone)) store.telephone = shop!.phone.replace(/\s+/g, "");
    if (hasContent(shop?.email)) store.email = shop!.email;
    const logo = absoluteUrl(shop?.logo_url ?? undefined);
    if (logo) store.logo = logo;
    const sameAs = socialProfileUrls(shop?.social_links);
    if (sameAs.length > 0) store.sameAs = sameAs;
    return [website, store];
  }, [brand, description, shop]);

  const seo: SeoData = {
    title: `${brand} | Car Accessories & Car Decor`,
    description,
    canonicalPath: "/",
    siteName: brand,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd,
  };

  return (
    <div>
      <SeoHead data={seo} />
      <HeroSection />
      <ValuePropositions />
      <CategorySection />
      <FeaturedProducts />
      <WhyChooseSection />
      <ContactCTA />
    </div>
  );
}