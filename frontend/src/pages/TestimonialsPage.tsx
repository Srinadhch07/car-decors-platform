import { Container } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { DEFAULT_OG_IMAGE, FALLBACK_BRAND, type SeoData } from "../lib/seo";
import { TestimonialForm, TestimonialsList } from "../features/testimonials";

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
    <section className="section-y">
      <SeoHead data={seo} />
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Customer Testimonials
          </h1>
          <p className="mt-3 text-text-secondary">
            See what our customers have to say about their experience with {brand}.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <TestimonialsList />
          </div>
          <aside>
            <div className="rounded-lg border border-border-light bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-text-primary">
                Share Your Experience
              </h2>
              <p className="mt-1 mb-4 text-sm text-text-secondary">
                Your testimonial will be reviewed before it appears publicly.
              </p>
              <TestimonialForm />
            </div>
          </aside>
        </div>
      </Container>
    </section>
  );
}

export default TestimonialsPage;
