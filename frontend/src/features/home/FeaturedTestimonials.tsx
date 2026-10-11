import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api/client";
import type { Testimonial } from "../../types/api";
import { Container, SectionHeading } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { TestimonialCard } from "../testimonials";

const MAX_FEATURED = 6;

export function FeaturedTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 32,
    stagger: 0.08,
    start: "top 88%",
  });

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

  if (items.length === 0) return null;

  return (
    <section ref={scopeRef} className="section-y bg-surface-muted">
      <Container>
        <SectionHeading
          title="What Our Customers Say"
          subtitle="Real feedback from customers who trusted us with their cars."
          centered
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((testimonial) => (
            <div key={testimonial.id} data-reveal className="h-full">
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/testimonials"
            className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
          >
            Read all testimonials
          </Link>
        </div>
      </Container>
    </section>
  );
}

export default FeaturedTestimonials;
