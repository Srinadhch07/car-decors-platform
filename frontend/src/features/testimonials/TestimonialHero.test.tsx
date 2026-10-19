import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { TestimonialHero } from "./TestimonialHero";

function renderHero() {
  return render(<TestimonialHero />, { wrapper: TestWrapper });
}

describe("TestimonialHero", () => {
  it("renders the page heading and brand", () => {
    renderHero();
    expect(screen.getByRole("heading", { name: "Customer Testimonials" })).toBeInTheDocument();
    expect(
      screen.getByText(/trusted Venkata Ramana Real Value Car Decors with their cars/i),
    ).toBeInTheDocument();
  });

  it("links the primary CTA to the submission section", () => {
    renderHero();
    expect(
      screen.getByRole("link", { name: /share your experience/i }),
    ).toHaveAttribute("href", "#share-your-experience");
  });

  it("links the secondary CTA to the gallery", () => {
    renderHero();
    expect(screen.getByRole("link", { name: /read the stories/i })).toHaveAttribute(
      "href",
      "#customer-stories",
    );
  });
});
