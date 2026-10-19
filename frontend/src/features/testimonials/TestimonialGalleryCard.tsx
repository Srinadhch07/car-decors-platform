import { Quote } from "lucide-react";
import type { Testimonial } from "../../types/api";
import { TestimonialStars } from "./TestimonialStars";

interface TestimonialGalleryCardProps {
  testimonial: Testimonial;
}

export function TestimonialGalleryCard({ testimonial }: TestimonialGalleryCardProps) {
  const isLong = testimonial.text.length > 180;

  return (
    <figure className="gallery-card card-surface mb-5 break-inside-avoid p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600/10">
          <Quote className="h-4 w-4 text-orange-500" aria-hidden="true" />
        </span>
        {testimonial.rating !== null && <TestimonialStars rating={testimonial.rating} />}
      </div>

      <blockquote
        className={`whitespace-pre-line leading-relaxed text-text-secondary ${
          isLong ? "text-sm" : "text-[0.95rem]"
        }`}
      >
        {testimonial.text}
      </blockquote>

      <figcaption className="mt-4 border-t border-border-light pt-3 text-sm font-semibold text-text-primary">
        {testimonial.customer_name}
      </figcaption>
    </figure>
  );
}

export default TestimonialGalleryCard;
