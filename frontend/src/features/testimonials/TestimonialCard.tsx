import { Quote, Star } from "lucide-react";
import type { Testimonial } from "../../types/api";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

function Rating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={
            index < rating
              ? "h-4 w-4 fill-orange-400 text-orange-400"
              : "h-4 w-4 text-border"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="card-surface flex h-full flex-col p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/10">
        <Quote className="h-5 w-5 text-orange-500" aria-hidden="true" />
      </div>
      <blockquote className="mt-4 flex-1 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
        {testimonial.text}
      </blockquote>
      <figcaption className="mt-4 flex items-center justify-between gap-3 border-t border-border-light pt-3">
        <span className="text-sm font-semibold text-text-primary">
          {testimonial.customer_name}
        </span>
        {testimonial.rating !== null && <Rating rating={testimonial.rating} />}
      </figcaption>
    </figure>
  );
}

export default TestimonialCard;
