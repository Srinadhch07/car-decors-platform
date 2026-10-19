import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Testimonial, TestimonialListPage } from "../../types/api";
import { FeaturedTestimonialCarousel } from "./FeaturedTestimonialCarousel";

function page(items: Testimonial[]): TestimonialListPage {
  return {
    items,
    page: 1,
    page_size: 6,
    total: items.length,
    total_pages: items.length > 0 ? 1 : 0,
  };
}

const handlers = [
  http.get("*/api/testimonials/featured", () =>
    HttpResponse.json(
      page([
        {
          id: "t1",
          customer_name: "Asha Rao",
          text: "Great service and quality.",
          rating: 5,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "t2",
          customer_name: "Vikram Shah",
          text: "Excellent fitting and finish.",
          rating: 4,
          created_at: "2024-02-01T00:00:00Z",
        },
      ]),
    ),
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderCarousel() {
  return render(<FeaturedTestimonialCarousel />, { wrapper: TestWrapper });
}

describe("FeaturedTestimonialCarousel", () => {
  it("renders featured testimonials with navigation controls", async () => {
    renderCarousel();
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Vikram Shah")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In Their Own Words" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next featured testimonial/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous featured testimonial/i }),
    ).toBeInTheDocument();
  });

  it("advances and rewinds through the slides", async () => {
    const user = userEvent.setup();
    renderCarousel();
    await screen.findByText("Asha Rao");

    expect(screen.getByText("Testimonial 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next featured testimonial/i }));
    expect(screen.getByText("Testimonial 2 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /previous featured testimonial/i }));
    expect(screen.getByText("Testimonial 1 of 2")).toBeInTheDocument();
  });

  it("jumps to a slide from a dot control", async () => {
    const user = userEvent.setup();
    renderCarousel();
    await screen.findByText("Asha Rao");

    await user.click(screen.getByRole("button", { name: /go to testimonial 2/i }));
    expect(screen.getByText("Testimonial 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go to testimonial 2/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("renders a single featured testimonial without carousel controls", async () => {
    server.use(
      http.get("*/api/testimonials/featured", () =>
        HttpResponse.json(
          page([
            {
              id: "solo",
              customer_name: "Solo Customer",
              text: "Loved it.",
              rating: null,
              created_at: "2024-03-01T00:00:00Z",
            },
          ]),
        ),
      ),
    );
    renderCarousel();
    expect(await screen.findByText("Solo Customer")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next featured testimonial/i }),
    ).toBeNull();
  });

  it("renders nothing when there are no featured testimonials", async () => {
    server.use(
      http.get("*/api/testimonials/featured", () =>
        HttpResponse.json({ items: [], page: 1, page_size: 6, total: 0, total_pages: 0 }),
      ),
    );
    const { container } = renderCarousel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector("section")).toBeNull();
  });
});
