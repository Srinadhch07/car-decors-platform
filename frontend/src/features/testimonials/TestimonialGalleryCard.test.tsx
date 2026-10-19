import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Testimonial } from "../../types/api";
import { TestimonialGalleryCard } from "./TestimonialGalleryCard";

function makeTestimonial(overrides: Partial<Testimonial> = {}): Testimonial {
  return {
    id: "t1",
    customer_name: "Asha Rao",
    text: "Great service and quality.",
    rating: 5,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("TestimonialGalleryCard", () => {
  it("renders the customer name and testimonial text", () => {
    render(<TestimonialGalleryCard testimonial={makeTestimonial()} />);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Great service and quality.")).toBeInTheDocument();
  });

  it("shows a rating only when one exists", () => {
    const { rerender } = render(
      <TestimonialGalleryCard testimonial={makeTestimonial({ rating: 4 })} />,
    );
    expect(screen.getByLabelText("4 out of 5 stars")).toBeInTheDocument();

    rerender(<TestimonialGalleryCard testimonial={makeTestimonial({ rating: null })} />);
    expect(screen.queryByLabelText(/out of 5 stars/)).toBeNull();
  });
});
