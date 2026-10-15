import { Link } from "react-router-dom";
import { Container } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { FALLBACK_BRAND } from "../lib/seo";

export function NotFoundPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;

  return (
    <div className="min-h-screen">
      <SeoHead
        data={{
          title: `Page Not Found | ${brand}`,
          description: "The page you're looking for doesn't exist or has been moved.",
          noIndex: true,
        }}
      />
      <section className="page-banner min-h-[60vh]">
        <div className="absolute inset-0 carbon-texture" aria-hidden="true" />
        <Container className="relative flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-sm">
            Lost Your Way?
          </p>
          <h1 className="mb-3 bg-gradient-to-b from-white/90 to-white/40 bg-clip-text text-[clamp(4rem,10vw,8rem)] font-bold leading-none tracking-tight text-transparent">
            404
          </h1>
          <h2 className="mb-4 text-xl font-semibold text-white">Page Not Found</h2>
          <p className="mb-8 text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
          >
            Back to Home
          </Link>
        </Container>
      </section>
    </div>
  );
}