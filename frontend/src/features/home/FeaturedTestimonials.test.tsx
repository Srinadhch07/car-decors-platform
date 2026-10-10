import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Testimonial, TestimonialListPage } from "../../types/api";
import { FeaturedTestimonials } from "./FeaturedTestimonials";

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
        makeTestimonial({ id: "t1", customer_name: "Asha Rao" }),
        makeTestimonial({ id: "t2", customer_name: "Vikram Shah", rating: 4 }),
      ]),
    ),
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderSection() {
  return render(<FeaturedTestimonials />, { wrapper: TestWrapper });
}

describe("FeaturedTestimonials", () => {
  it("renders featured testimonials and the section heading", async () => {
    renderSection();
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Vikram Shah")).toBeInTheDocument();
    expect(screen.getByText("What Our Customers Say")).toBeInTheDocument();
  });

  it("links to the testimonials page", async () => {
    renderSection();
    const link = await screen.findByRole("link", { name: /read all testimonials/i });
    expect(link).toHaveAttribute("href", "/testimonials");
  });

  it("renders nothing when there are no featured testimonials", async () => {
    let fetched = false;
    server.use(
      http.get("*/api/testimonials/featured", () => {
        fetched = true;
        return HttpResponse.json(page([]));
      }),
    );
    const { container } = renderSection();
    await waitFor(() => expect(fetched).toBe(true));
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });

  it("renders nothing when the request fails", async () => {
    let fetched = false;
    server.use(
      http.get("*/api/testimonials/featured", () => {
        fetched = true;
        return HttpResponse.error();
      }),
    );
    const { container } = renderSection();
    await waitFor(() => expect(fetched).toBe(true));
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
