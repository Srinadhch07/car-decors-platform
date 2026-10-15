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
    <div>
      <SeoHead data={seo} />
      {/* Page banner */}
      <section className="page-banner border-b border-dark-700">
        <div className="absolute inset-0 carbon-texture" aria-hidden="true" />
        <Container className="relative py-12 text-center sm:py-16">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-sm">
            Our Story
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            About Us
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-400">
            A trusted name in car accessories and decor — helping you personalise and protect your ride.
          </p>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        <AboutSection />
        <div className="mt-12 text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
          >
            Browse Our Products
          </Link>
        </div>
      </Container>
    </div>
  );
}