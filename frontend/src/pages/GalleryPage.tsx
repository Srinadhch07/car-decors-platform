import { Container, SectionHeading } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { DEFAULT_OG_IMAGE, FALLBACK_BRAND, type SeoData } from "../lib/seo";
import { OurWorkGallery } from "../features/gallery";

export function GalleryPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;

  const seo: SeoData = {
    title: `Our Work | ${brand}`,
    description: `Browse photos and videos of real car decor, interiors and detailing work completed by ${brand}.`,
    canonicalPath: "/gallery",
    siteName: brand,
    ogImage: DEFAULT_OG_IMAGE,
  };

  return (
    <div>
      <SeoHead data={seo} />

      <section className="section-y overflow-hidden bg-dark-950 text-white">
        <Container>
          <SectionHeading
            eyebrow="Gallery"
            title="Our Work"
            subtitle="Real interiors, finishes and detailing from our workshop."
            tone="dark"
            centered
          />
        </Container>
      </section>

      <section className="section-y">
        <Container>
          <OurWorkGallery />
        </Container>
      </section>
    </div>
  );
}

export default GalleryPage;
