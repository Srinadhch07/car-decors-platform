import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { api } from "../../lib/api/client";
import type { Testimonial } from "../../types/api";
import { Container, SectionHeading } from "../../components/ui";
import { useReducedMotion, useTilt } from "../../lib/motion";
import { TestimonialStars } from "./TestimonialStars";

const MAX_FEATURED = 6;
const SWIPE_THRESHOLD = 40;

function FeaturedSlide({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="card-surface relative h-full overflow-hidden p-8 sm:p-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-600/60 to-transparent"
      />
      <Quote
        aria-hidden="true"
        className="absolute -right-3 -top-3 h-24 w-24 text-orange-500/10"
      />
      {testimonial.rating !== null && (
        <TestimonialStars rating={testimonial.rating} />
      )}
      <blockquote className="relative mt-5 whitespace-pre-line text-lg leading-relaxed text-text-primary sm:text-xl">
        {testimonial.text}
      </blockquote>
      <figcaption className="mt-6 border-t border-border-light pt-4 text-sm font-semibold text-text-primary">
        {testimonial.customer_name}
      </figcaption>
    </figure>
  );
}

export function FeaturedTestimonialCarousel() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const tiltRef = useTilt<HTMLDivElement>(2);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getFeaturedTestimonials({ page_size: MAX_FEATURED })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = items.length;

  const goTo = useCallback(
    (target: number) => {
      if (count === 0) return;
      setIndex(((target % count) + count) % count);
    },
    [count],
  );

  const prev = useCallback(() => setIndex((index - 1 + count) % count), [count, index]);
  const next = useCallback(() => setIndex((index + 1) % count), [count, index]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
    },
    [prev, next],
  );

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start === null) return;
      const end = event.changedTouches[0]?.clientX ?? start;
      const delta = end - start;
      if (Math.abs(delta) < SWIPE_THRESHOLD) return;
      if (delta < 0) next();
      else prev();
    },
    [next, prev],
  );

  if (count === 0) return null;

  const heading = (
    <SectionHeading
      eyebrow="Featured Stories"
      title="In Their Own Words"
      subtitle="Hand-picked experiences from customers who trusted us with their cars."
      centered
    />
  );

  if (count === 1) {
    return (
      <section className="section-y">
        <Container>
          {heading}
          <div className="mx-auto max-w-3xl">
            <FeaturedSlide testimonial={items[0]} />
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="section-y">
      <Container>
        {heading}
        <div
          ref={tiltRef}
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured testimonials"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative mx-auto max-w-3xl"
          style={{ perspective: "1200px" }}
        >
          <div className="overflow-hidden rounded-2xl">
            <div
              className={`flex ${reduced ? "" : "transition-transform duration-500 ease-out"}`}
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {items.map((testimonial, i) => (
                <div
                  key={testimonial.id}
                  className="w-full shrink-0"
                  aria-hidden={i !== index}
                >
                  <FeaturedSlide testimonial={testimonial} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous featured testimonial"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:border-orange-500 hover:text-orange-600"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  aria-current={i === index}
                  className={`h-2.5 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-orange-600"
                      : "w-2.5 bg-border hover:bg-orange-400"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              aria-label="Next featured testimonial"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition-colors hover:border-orange-500 hover:text-orange-600"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <p className="sr-only" aria-live="polite">
            Testimonial {index + 1} of {count}
          </p>
        </div>
      </Container>
    </section>
  );
}

export default FeaturedTestimonialCarousel;
