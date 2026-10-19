import { Container, SectionHeading } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { DEFAULT_OG_IMAGE, FALLBACK_BRAND, type SeoData } from "../lib/seo";
import {
  FeaturedTestimonialCarousel,
  ShareExperienceSection,
  TestimonialHero,
  TestimonialsList,
} from "../features/testimonials";

export function TestimonialsPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name ?? FALLBACK_BRAND;

  const seo: SeoData = {
    title: `Customer Testimonials | ${brand}`,
    description: `Read what customers say about ${brand} and share your own car decor experience.`,
    canonicalPath: "/testimonials",
    siteName: brand,
    ogImage: DEFAULT_OG_IMAGE,
  };

  return (
    <div>
      <SeoHead data={seo} />

      <TestimonialHero />

      <FeaturedTestimonialCarousel />

      <section id="customer-stories" className="section-y scroll-mt-20">
        <Container>
          <SectionHeading
            eyebrow="The Gallery"
            title="Customer Stories"
            subtitle="Browse real experiences shared by customers who visited us."
            centered
          />
          <TestimonialsList />
        </Container>
      </section>

      <ShareExperienceSection />
    </div>
  );
}

export default TestimonialsPage;
