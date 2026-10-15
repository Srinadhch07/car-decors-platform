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
    <div>
      <SeoHead data={seo} />
      {/* Page banner */}
      <section className="page-banner border-b border-dark-700">
        <div className="absolute inset-0 carbon-texture" aria-hidden="true" />
        <Container className="relative py-12 text-center sm:py-16">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-sm">
            Trusted Feedback
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Customer Testimonials
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-400">
            See what our customers have to say about their experience with {brand}.
          </p>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        <div className="mt-0 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <TestimonialsList />
          </div>
          <aside>
            <div className="card-surface overflow-hidden">
              <div
                aria-hidden="true"
                className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-600/60 to-transparent"
              />
              <div className="p-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  Share Your Experience
                </h2>
                <p className="mt-1 mb-4 text-sm text-text-secondary">
                  Your testimonial will be reviewed before it appears publicly.
                </p>
                <TestimonialForm />
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

export default TestimonialsPage;
