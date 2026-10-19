import { PenLine, Quote } from "lucide-react";
import { Container } from "../../components/ui";
import { useShopSettings } from "../../context/ShopSettingsContext";

export function TestimonialHero() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name;

  return (
    <section className="page-banner relative overflow-hidden border-b border-dark-700">
      <div className="absolute inset-0 carbon-texture" aria-hidden="true" />
      <div
        className="banner-grid pointer-events-none absolute inset-x-0 top-0 h-40"
        aria-hidden="true"
      />
      <Container className="relative py-14 text-center sm:py-20">
        <div
          aria-hidden="true"
          className="animate-emblem-float mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-floating backdrop-blur-sm"
          style={{ transformStyle: "preserve-3d" }}
        >
          <Quote className="h-7 w-7 text-orange-400" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-sm">
          Stories From The Driver's Seat
        </p>
        <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Customer Testimonials
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-300">
          Real experiences from drivers who trusted
          {brand ? ` ${brand}` : " us"} with their cars.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#share-your-experience"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Share Your Experience
          </a>
          <a
            href="#customer-stories"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Read the stories
          </a>
        </div>
      </Container>
    </section>
  );
}

export default TestimonialHero;
