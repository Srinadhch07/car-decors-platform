import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Category } from "../../types/api";
import { ExploreOfferings } from "./ExploreOfferings";

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: "c1",
    name: "Interior Decor",
    slug: "interior-decor",
    description: "Seat covers, mats and more",
    image_url: null,
    sort_order: 0,
    is_active: true,
    ...overrides,
  };
}

const mockCategories: Category[] = [
  category({ id: "c1", name: "Interior Decor", slug: "interior-decor" }),
  category({ id: "c2", name: "Exterior Styling", slug: "exterior-styling" }),
  category({ id: "c3", name: "Inactive", slug: "hidden", is_active: false }),
];

const server = setupServer(
  http.get("*/api/categories", () => HttpResponse.json(mockCategories)),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ExploreOfferings", () => {
  it("renders active categories and links to each", async () => {
    render(<ExploreOfferings />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: "Explore Our Offerings" }),
    ).toBeInTheDocument();

    await screen.findByRole("link", { name: /Browse Interior Decor/i });
    expect(screen.getByText("Interior Decor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View All Products/i })).toBeInTheDocument();
  });

  it("links each offering to its category page", async () => {
    render(<ExploreOfferings />, { wrapper: TestWrapper });
    const link = await screen.findByRole("link", { name: /Browse Interior Decor/i });
    expect(screen.getByText("Interior Decor")).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/categories/interior-decor");
  });

  it("shows an empty state when there are no categories", async () => {
    server.use(http.get("*/api/categories", () => HttpResponse.json([])));
    render(<ExploreOfferings />, { wrapper: TestWrapper });
    expect(await screen.findByText(/Offerings coming soon/i)).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    server.use(http.get("*/api/categories", () => HttpResponse.error()));
    render(<ExploreOfferings />, { wrapper: TestWrapper });
    expect(
      await screen.findByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });
});
