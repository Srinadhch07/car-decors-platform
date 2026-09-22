import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Container } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { AboutSection } from "../features/info/AboutSection";

export function AboutPage() {
  const { data: shop } = useShopSettings();

  useEffect(() => {
    document.title = `About | ${shop?.shop_name ?? "Car Decor"}`;
  }, [shop]);

  return (
    <section className="section-y">
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