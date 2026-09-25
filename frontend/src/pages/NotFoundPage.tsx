import { Link } from "react-router-dom";
import { Container } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { FALLBACK_BRAND } from "../lib/seo";

export function NotFoundPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;

  return (
    <section className="section-y">
      <SeoHead
        data={{
          title: `Page Not Found | ${brand}`,
          description: "The page you're looking for doesn't exist or has been moved.",
          noIndex: true,
        }}
      />
      <Container className="flex flex-col items-center text-center">
        <h1 className="mb-2 text-6xl font-bold text-text-muted">404</h1>
        <h2 className="mb-4 text-xl font-semibold">Page Not Found</h2>
        <p className="mb-6 text-text-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          Back to Home
        </Link>
      </Container>
    </section>
  );
}