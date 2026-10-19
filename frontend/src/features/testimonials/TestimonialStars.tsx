import { Star } from "lucide-react";

interface TestimonialStarsProps {
  rating: number;
}

export function TestimonialStars({ rating }: TestimonialStarsProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={
            index < rating
              ? "h-4 w-4 fill-orange-500 text-orange-500"
              : "h-4 w-4 text-border"
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default TestimonialStars;
