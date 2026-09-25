import { Link } from "react-router-dom";
import { Container } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { DEFAULT_OG_IMAGE, FALLBACK_BRAND, type SeoData } from "../lib/seo";
import { AboutSection } from "../features/info/AboutSection";

export function AboutPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;

  const seo: SeoData = {
    title: `About | ${brand}`,
    description: `Learn about ${brand}, a car accessories and car decor shop in Hanamkonda, Telangana, helping customers find the right products for their cars.`,
    canonicalPath: "/about",
    siteName: brand,
    ogImage: DEFAULT_OG_IMAGE,
  };

  return (
    <section className="section-y">
      <SeoHead data={seo} />
      <Container>
        <AboutSection />
        <div className="mt-12 text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 shadow-sm"
          >
            Browse Our Products
          </Link>
        </div>
      </Container>
    </section>
  );
}