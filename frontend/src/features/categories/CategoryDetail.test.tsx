import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Category, ProductListPage, Subcategory } from "../../types/api";
import { CategoryDetail } from "./CategoryDetail";

const mockCategory: Category = {
  id: "cat-1",
  name: "Seat Covers",
  slug: "seat-covers",
  description: "Premium seat covers for all vehicles",
  image_url: null,
  sort_order: 0,
  is_active: true,
};

const mockCategoryWithImage: Category = {
  ...mockCategory,
  slug: "interior-lighting",
  name: "Interior Lighting",
  description: "Upgrade your cabin ambience",
  image_url: "/images/categories/lighting.jpg",
};

const mockSubcategories: Subcategory[] = [
  { id: "sub-1", category_id: "cat-1", name: "Leather", slug: "leather", image_url: null, sort_order: 0, is_active: true },
  { id: "sub-2", category_id: "cat-1", name: "Fabric", slug: "fabric", image_url: null, sort_order: 1, is_active: true },
];

const mockProducts: ProductListPage = {
  items: [
    {
      id: "1", category_id: "cat-1", subcategory_id: "sub-1", name: "Premium Leather Cover",
      slug: "premium-leather-cover", description: "Top quality", price: "2999",
      availability: "IN_STOCK", is_active: true, vehicle_tags: ["Swift"],
      image_url: null, created_at: "2024-01-01", updated_at: "2024-01-01",
    },
    {
      id: "2", category_id: "cat-1", subcategory_id: "sub-2", name: "Fabric Seat Cover",
      slug: "fabric-seat-cover", description: "Comfortable", price: "1499",
      availability: "IN_STOCK", is_active: true, vehicle_tags: [],
      image_url: null, created_at: "2024-01-02", updated_at: "2024-01-02",
    },
  ],
  page: 1, page_size: 20, total: 2, total_pages: 1,
};

let lastRequestUrl = "";
let requestCount = 0;

const server = setupServer(
  http.get("*/api/categories/:slug", ({ params }) => {
    if (params.slug === "seat-covers") return HttpResponse.json(mockCategory);
    if (params.slug === "interior-lighting") return HttpResponse.json(mockCategoryWithImage);
    return new HttpResponse(null, { status: 404 });
  }),
  http.get("*/api/categories/:slug/subcategories", ({ params }) => {
    if (params.slug === "seat-covers") return HttpResponse.json(mockSubcategories);
    if (params.slug === "interior-lighting") return HttpResponse.json(mockSubcategories);
    return new HttpResponse(null, { status: 404 });
  }),
  http.get("*/api/products", ({ request }) => {
    lastRequestUrl = new URL(request.url).search;
    requestCount += 1;
    return HttpResponse.json(mockProducts);
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastRequestUrl = "";
  requestCount = 0;
});
afterAll(() => server.close());

function renderCategory(slug: string, initialEntries: string[] = []) {
  return render(<CategoryDetail slug={slug} />, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={[`/categories/${slug}`, ...initialEntries]}>{children}</TestWrapper>
    ),
  });
}

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.getByText("Premium Leather Cover")).toBeInTheDocument();
  });
}

describe("CategoryDetail", () => {
  it("renders category name and description", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByRole("heading", { name: "Seat Covers" })).toBeInTheDocument();
    expect(screen.getByText("Premium seat covers for all vehicles")).toBeInTheDocument();
  });

  it("renders breadcrumb navigation", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    const nav = screen.getByLabelText("Breadcrumb");
    expect(nav).toBeInTheDocument();
    expect(screen.getByText("Home")).toHaveAttribute("href", "/");
    expect(screen.getByText("Products")).toHaveAttribute("href", "/products");
  });

  it("renders subcategory pills", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByText("Leather")).toBeInTheDocument();
    expect(screen.getByText("Fabric")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all seat covers/i })).toBeInTheDocument();
  });

  it("renders products in the category", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByText("Premium Leather Cover")).toBeInTheDocument();
    expect(screen.getByText("Fabric Seat Cover")).toBeInTheDocument();
  });

  it("shows product count", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByText("2 products found")).toBeInTheDocument();
  });

  it("shows sort dropdown", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("subcategory click updates URL and filters products", async () => {
    const user = userEvent.setup();
    renderCategory("seat-covers");
    await waitForLoad();

    await user.click(screen.getByRole("button", { name: "Leather" }));

    await waitFor(() => {
      expect(lastRequestUrl).toContain("subcategory=leather");
    });
  });

  it("clicking 'All' clears subcategory", async () => {
    const user = userEvent.setup();
    renderCategory("seat-covers", ["?subcategory=leather"]);
    await waitForLoad();

    await user.click(screen.getByRole("button", { name: /all seat covers/i }));

    await waitFor(() => {
      expect(lastRequestUrl).not.toContain("subcategory=");
    });
  });

  it("subcategory pills have active state for selected subcategory", async () => {
    renderCategory("seat-covers", ["?subcategory=leather"]);
    await waitForLoad();
    const leatherBtn = screen.getByRole("button", { name: "Leather" });
    expect(leatherBtn).toHaveClass("bg-orange-600");
  });

  it("shows error for non-existent category", async () => {
    renderCategory("nonexistent");
    await waitFor(() => {
      expect(screen.getByText("Category Not Found")).toBeInTheDocument();
    });
  });

  it("shows error on API failure", async () => {
    server.use(
      http.get("*/api/categories/:slug", () => HttpResponse.error()),
    );
    renderCategory("seat-covers");
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it("updates page title", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(document.title).toContain("Seat Covers");
  });

  it("sends correct query params to API", async () => {
    renderCategory("seat-covers", ["?subcategory=fabric&sort=price_asc&page=1"]);
    await waitForLoad();
    expect(lastRequestUrl).toContain("category=seat-covers");
    expect(lastRequestUrl).toContain("subcategory=fabric");
    expect(lastRequestUrl).toContain("sort=price_asc");
  });

  it("renders category image when available", async () => {
    renderCategory("interior-lighting");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Interior Lighting" })).toBeInTheDocument();
    });
    const img = screen.getByRole("img", { name: "Interior Lighting" });
    expect(img).toHaveAttribute("src", "/images/categories/lighting.jpg");
  });

  it("shows fallback image when category has no image", async () => {
    const { container } = renderCategory("seat-covers");
    await waitForLoad();
    const fallbackImg = container.querySelector('img[src="/images/category-fallback.svg"]');
    expect(fallbackImg).toBeInTheDocument();
  });

  it("product cards link to correct product slugs", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByRole("link", { name: /view premium leather cover/i })).toHaveAttribute(
      "href",
      "/products/premium-leather-cover",
    );
    expect(screen.getByRole("link", { name: /view fabric seat cover/i })).toHaveAttribute(
      "href",
      "/products/fabric-seat-cover",
    );
  });

  it("sort change updates URL and resets page to 1", async () => {
    const user = userEvent.setup();
    renderCategory("seat-covers", ["?page=2&subcategory=fabric"]);
    await waitForLoad();

    await user.selectOptions(screen.getByRole("combobox"), "price_asc");

    await waitFor(() => {
      expect(lastRequestUrl).toContain("sort=price_asc");
      expect(lastRequestUrl).toContain("page=1");
      expect(lastRequestUrl).toContain("subcategory=fabric");
    });
  });

  it("sort renders all backend-supported options", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual([
      "newest",
      "oldest",
      "name_asc",
      "name_desc",
      "price_asc",
      "price_desc",
    ]);
  });

  it("renders pagination for multi-page results", async () => {
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({
          ...mockProducts,
          page: 1,
          total: 25,
          total_pages: 2,
        }),
      ),
    );
    renderCategory("seat-covers");
    await waitForLoad();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });

  it("pagination click updates page in URL", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/products", ({ request }) => {
        lastRequestUrl = new URL(request.url).search;
        const reqUrl = new URL(request.url);
        const page = parseInt(reqUrl.searchParams.get("page") ?? "1", 10);
        return HttpResponse.json({ ...mockProducts, page, total: 25, total_pages: 2 });
      }),
    );
    renderCategory("seat-covers");
    await waitForLoad();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(lastRequestUrl).toContain("page=2");
    });
  });

  it("pagination preserves subcategory and sort", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/products", ({ request }) => {
        lastRequestUrl = new URL(request.url).search;
        return HttpResponse.json({ ...mockProducts, page: 1, total: 25, total_pages: 3 });
      }),
    );
    renderCategory("seat-covers", ["?subcategory=fabric&sort=price_asc&page=1"]);
    await waitForLoad();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(lastRequestUrl).toContain("page=2");
      expect(lastRequestUrl).toContain("subcategory=fabric");
      expect(lastRequestUrl).toContain("sort=price_asc");
    });
  });

  it("shows empty state with no products and links to all products", async () => {
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 }),
      ),
    );
    renderCategory("seat-covers");
    await waitFor(() => {
      expect(screen.getByText("No products in this category")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Browse All Products" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("empty subcategory offers to view all category products", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 }),
      ),
    );
    renderCategory("seat-covers", ["?subcategory=fabric"]);
    await waitFor(() => {
      expect(screen.getByText("No products in this subcategory")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /view all seat covers/i }));
    await waitFor(() => {
      expect(lastRequestUrl).not.toContain("subcategory=");
    });
  });

  it("shows error state on product API failure while category renders", async () => {
    server.use(
      http.get("*/api/products", () => HttpResponse.error()),
    );
    renderCategory("seat-covers");
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Seat Covers" })).toBeInTheDocument();
  });

  it("renders loading skeleton while products load", async () => {
    server.use(
      http.get("*/api/products", async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json(mockProducts);
      }),
    );
    renderCategory("seat-covers");
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    await waitForLoad();
    expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("mobile subcategory pills and sort have touch-friendly sizing", async () => {
    renderCategory("seat-covers");
    await waitForLoad();
    const allBtn = screen.getByRole("button", { name: /all seat covers/i });
    expect(allBtn.className).toContain("py-1.5");
    expect(allBtn.className).toContain("px-4");
  });
});
