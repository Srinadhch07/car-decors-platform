import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Testimonial, TestimonialListPage } from "../../types/api";
import { TestimonialsList } from "./TestimonialsList";

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

function page(items: Testimonial[], current = 1, total?: number): TestimonialListPage {
  const count = total ?? items.length;
  return {
    items,
    page: current,
    page_size: 6,
    total: count,
    total_pages: Math.max(1, Math.ceil(count / 6)),
  };
}

let lastUrl = "";

const handlers = [
  http.get("*/api/testimonials", ({ request }) => {
    lastUrl = request.url;
    return HttpResponse.json(
      page([
        makeTestimonial({ id: "t1", customer_name: "Asha Rao" }),
        makeTestimonial({
          id: "t2",
          customer_name: "Vikram Shah",
          text: "Excellent fitting and finish.",
          rating: null,
        }),
      ]),
    );
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastUrl = "";
});
afterAll(() => server.close());

function renderList() {
  return render(<TestimonialsList />, { wrapper: TestWrapper });
}

describe("TestimonialsList", () => {
  it("renders testimonial cards from the API", async () => {
    renderList();
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Vikram Shah")).toBeInTheDocument();
    expect(screen.getByText("Great service and quality.")).toBeInTheDocument();
  });

  it("shows the empty state when there are no testimonials", async () => {
    server.use(http.get("*/api/testimonials", () => HttpResponse.json(page([]))));
    renderList();
    expect(await screen.findByText("No testimonials yet")).toBeInTheDocument();
  });

  it("shows an error state on failure and retries on demand", async () => {
    let attempts = 0;
    server.use(
      http.get("*/api/testimonials", () => {
        attempts += 1;
        if (attempts === 1) return HttpResponse.error();
        return HttpResponse.json(page([makeTestimonial({ customer_name: "Recovered User" })]));
      }),
    );
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Recovered User")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("requests the next page when pagination is used", async () => {
    server.use(
      http.get("*/api/testimonials", ({ request }) => {
        lastUrl = request.url;
        const current = Number(new URL(request.url).searchParams.get("page") ?? "1");
        if (current === 2) {
          return HttpResponse.json(
            page([makeTestimonial({ id: "t3", customer_name: "Second Page User" })], 2, 7),
          );
        }
        return HttpResponse.json(
          page([makeTestimonial({ id: "t1", customer_name: "First Page User" })], 1, 7),
        );
      }),
    );
    const user = userEvent.setup();
    renderList();

    await screen.findByText("First Page User");
    await user.click(screen.getByRole("button", { name: /page 2/i }));

    expect(await screen.findByText("Second Page User")).toBeInTheDocument();
    expect(new URL(lastUrl).searchParams.get("page")).toBe("2");
  });
});
