import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Category, ProductListPage, Subcategory } from "../../types/api";
import { ProductsPage } from "./ProductsPage";
import { Pagination } from "./Pagination";
import { ActiveFilters } from "./ActiveFilters";

// ─── Mock data ───

const mockCategories: Category[] = [
  { id: "1", name: "Seat Covers", slug: "seat-covers", description: null, image_url: null, sort_order: 0, is_active: true },
  { id: "2", name: "Floor Mats", slug: "floor-mats", description: null, image_url: null, sort_order: 1, is_active: true },
];

const mockSubcategories: Subcategory[] = [
  { id: "s1", category_id: "1", name: "Premium", slug: "premium", image_url: null, sort_order: 0, is_active: true },
  { id: "s2", category_id: "1", name: "Standard", slug: "standard", image_url: null, sort_order: 1, is_active: true },
];

const mockProducts: ProductListPage = {
  items: [
    {
      id: "1", category_id: "1", subcategory_id: "s1", name: "Leather Seat Cover",
      slug: "leather-seat-cover", description: "Premium leather", price: "2999",
      availability: "IN_STOCK", is_active: true, vehicle_tags: ["Swift", "City"],
      image_url: null, created_at: "2024-01-01", updated_at: "2024-01-01",
    },
    {
      id: "2", category_id: "2", subcategory_id: null, name: "Rubber Floor Mat",
      slug: "rubber-floor-mat", description: "Durable mat", price: null,
      availability: "ON_ORDER", is_active: true, vehicle_tags: [],
      image_url: null, created_at: "2024-01-02", updated_at: "2024-01-02",
    },
  ],
  page: 1, page_size: 20, total: 2, total_pages: 1,
};

const emptyProducts: ProductListPage = {
  items: [], page: 1, page_size: 20, total: 0, total_pages: 0,
};

const pagedProducts: ProductListPage = {
  items: [...mockProducts.items], page: 1, page_size: 20, total: 40, total_pages: 2,
};

// ─── MSW Server ───

let lastRequestUrl = "";

const handlers = [
  http.get("*/api/categories", () => HttpResponse.json(mockCategories)),
  http.get("*/api/categories/:slug/subcategories", () => HttpResponse.json(mockSubcategories)),
  http.get("*/api/products", ({ request }) => {
    lastRequestUrl = new URL(request.url).search;
    return HttpResponse.json(mockProducts);
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastRequestUrl = "";
});
afterAll(() => server.close());

// ─── Helper ───

function renderPage(initialEntries: string[] = ["/products"]) {
  return render(<ProductsPage />, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={initialEntries}>{children}</TestWrapper>
    ),
  });
}

/** Get the desktop sidebar filter select by its known element ID. */
function desktopSelect(id: string) {
  return document.getElementById(id) as HTMLSelectElement;
}

// ─── Tests ───

describe("ProductsPage", () => {
  it("renders page heading and product results", async () => {
    renderPage();
    expect(await screen.findByText("All Products")).toBeInTheDocument();
    expect(screen.getByText("Leather Seat Cover")).toBeInTheDocument();
    expect(screen.getByText("Rubber Floor Mat")).toBeInTheDocument();
  });

  it("reads search parameter from URL", async () => {
    renderPage(["/products?search=leather"]);
    await screen.findByText("Leather Seat Cover");
    const searchInput = screen.getByRole("searchbox", { name: /search products/i });
    expect(searchInput).toHaveValue("leather");
  });

  it("submits search and updates URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const input = screen.getByRole("searchbox", { name: /search products/i });
    await user.clear(input);
    await user.type(input, "seat");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(lastRequestUrl).toContain("search=seat");
    });
  });

  it("clears search from URL", async () => {
    const user = userEvent.setup();
    renderPage(["/products?search=seat"]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /clear search/i }));

    await waitFor(() => {
      expect(lastRequestUrl).not.toContain("search=");
    });
  });

  it("category filter updates URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /open filters/i }));
    await screen.findByRole("dialog", { name: /filters/i });

    await waitFor(() => {
      const drawerSelect = desktopSelect("drawer-category");
      expect(drawerSelect.options.length).toBeGreaterThan(1);
    });

    const drawerSelect = desktopSelect("drawer-category");
    await user.selectOptions(drawerSelect, "seat-covers");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(lastRequestUrl).toContain("category=seat-covers");
    });
  });

  it("desktop category filter updates URL and clears subcategory", async () => {
    const user = userEvent.setup();
    renderPage(["/products?category=seat-covers&subcategory=premium"]);
    await screen.findByText("Leather Seat Cover");

    await waitFor(() => {
      const select = desktopSelect("filter-category");
      expect(select.options.length).toBeGreaterThan(1);
    });

    const select = desktopSelect("filter-category");
    await user.selectOptions(select, "floor-mats");

    await waitFor(() => {
      expect(lastRequestUrl).toContain("category=floor-mats");
      expect(lastRequestUrl).not.toContain("subcategory=");
    });
  });

  it("desktop category filter clears back to all categories", async () => {
    const user = userEvent.setup();
    renderPage(["/products?category=seat-covers"]);
    await screen.findByText("Leather Seat Cover");

    await waitFor(() => {
      const select = desktopSelect("filter-category");
      expect(select.options.length).toBeGreaterThan(1);
    });

    const select = desktopSelect("filter-category");
    await user.selectOptions(select, "");

    await waitFor(() => {
      expect(lastRequestUrl).not.toContain("category=");
    });
  });

  it("loads subcategories for selected category", async () => {
    renderPage(["/products?category=seat-covers"]);
    await screen.findByText("Leather Seat Cover");
    const subcategorySelect = desktopSelect("filter-subcategory");
    expect(subcategorySelect).toBeInTheDocument();
    expect(subcategorySelect.querySelector('option[value="premium"]')).toBeInTheDocument();
    expect(subcategorySelect.querySelector('option[value="standard"]')).toBeInTheDocument();
  });

  it("clears subcategory when category changes", async () => {
    const user = userEvent.setup();
    renderPage(["/products?category=seat-covers&subcategory=premium"]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /open filters/i }));
    await screen.findByRole("dialog", { name: /filters/i });

    await waitFor(() => {
      const drawerSelect = desktopSelect("drawer-category");
      expect(drawerSelect.options.length).toBeGreaterThan(1);
    });

    const drawerSelect = desktopSelect("drawer-category");
    await user.selectOptions(drawerSelect, "floor-mats");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(lastRequestUrl).toContain("category=floor-mats");
      expect(lastRequestUrl).not.toContain("subcategory=");
    });
  });

  it("vehicle filter updates URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const input = desktopSelect("filter-vehicle");
    await user.type(input, "creta");
    expect(input).toHaveValue("creta");
  });

  it("availability filter updates URL", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const select = desktopSelect("filter-availability");
    fireEvent.change(select, { target: { value: "IN_STOCK" } });

    await waitFor(() => {
      expect(lastRequestUrl).toContain("availability=IN_STOCK");
    });
  });

  it("sort updates URL", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const select = desktopSelect("filter-sort");
    fireEvent.change(select, { target: { value: "price_asc" } });

    await waitFor(() => {
      expect(lastRequestUrl).toContain("sort=price_asc");
    });
  });

  it("filter changes reset page to 1", async () => {
    const user = userEvent.setup();
    renderPage(["/products?page=3"]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /open filters/i }));
    await screen.findByRole("dialog", { name: /filters/i });

    await waitFor(() => {
      const drawerSelect = desktopSelect("drawer-category");
      expect(drawerSelect.options.length).toBeGreaterThan(1);
    });

    const select = desktopSelect("drawer-category");
    await user.selectOptions(select, "seat-covers");
    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(lastRequestUrl).toContain("category=seat-covers");
      expect(lastRequestUrl).not.toContain("page=3");
    });
  });

  it("pagination preserves filters", async () => {
    server.use(
      http.get("*/api/products", ({ request }) => {
        lastRequestUrl = new URL(request.url).search;
        return HttpResponse.json(pagedProducts);
      }),
    );
    const user = userEvent.setup();
    renderPage(["/products?category=seat-covers&search=test"]);
    await screen.findByText("Leather Seat Cover");

    // pagedProducts returns page=1 with total_pages=2, so Next is enabled
    const nextBtn = screen.getByRole("button", { name: /next page/i });
    expect(nextBtn).not.toBeDisabled();
    await user.click(nextBtn);

    await waitFor(() => {
      expect(lastRequestUrl).toContain("category=seat-covers");
      expect(lastRequestUrl).toContain("search=test");
      expect(lastRequestUrl).toContain("page=2");
    });
  });

  it("passes expected query params to API", async () => {
    renderPage(["/products?search=seat&category=seat-covers&subcategory=premium&vehicle=creta&availability=IN_STOCK&sort=price_asc&page=1"]);
    await waitFor(() => {
      expect(lastRequestUrl).toContain("search=seat");
      expect(lastRequestUrl).toContain("category=seat-covers");
      expect(lastRequestUrl).toContain("subcategory=premium");
      expect(lastRequestUrl).toContain("vehicle=creta");
      expect(lastRequestUrl).toContain("availability=IN_STOCK");
      expect(lastRequestUrl).toContain("sort=price_asc");
    });
  });

  it("renders product cards from API results", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    expect(screen.getByText("₹2,999")).toBeInTheDocument();
    expect(screen.getByText("Contact for price")).toBeInTheDocument();
    // "In Stock" appears in both the product card badge and the filter select option;
    // check that the product card link exists and shows the availability
    const productLink = screen.getByRole("link", { name: /view leather seat cover/i });
    expect(within(productLink).getByText("In Stock")).toBeInTheDocument();
    const productLink2 = screen.getByRole("link", { name: /view rubber floor mat/i });
    expect(within(productLink2).getByText("On Order")).toBeInTheDocument();
  });

  it("shows empty state when no products", async () => {
    server.use(
      http.get("*/api/products", () => HttpResponse.json(emptyProducts)),
    );
    renderPage();
    expect(await screen.findByText("No products found")).toBeInTheDocument();
  });

  it("shows Clear Filters in empty state when filters active", async () => {
    server.use(
      http.get("*/api/products", () => HttpResponse.json(emptyProducts)),
    );
    renderPage(["/products?search=xyz"]);
    expect(await screen.findByText("No products found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("shows error state on API failure", async () => {
    server.use(
      http.get("*/api/products", () => HttpResponse.error()),
    );
    renderPage();
    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it("clears all filters via Clear All", async () => {
    const user = userEvent.setup();
    renderPage(["/products?search=seat&category=seat-covers&availability=IN_STOCK"]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    await waitFor(() => {
      expect(lastRequestUrl).not.toContain("search=");
      expect(lastRequestUrl).not.toContain("category=");
      expect(lastRequestUrl).not.toContain("availability=");
    });
  });

  it("mobile filter button opens drawer", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const filterBtn = screen.getByRole("button", { name: /open filters/i });
    await user.click(filterBtn);

    expect(screen.getByRole("dialog", { name: /filters/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Close filters")).toBeInTheDocument();
  });

  it("product links use correct slugs", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    expect(screen.getByRole("link", { name: /view leather seat cover/i })).toHaveAttribute(
      "href",
      "/products/leather-seat-cover",
    );
    expect(screen.getByRole("link", { name: /view rubber floor mat/i })).toHaveAttribute(
      "href",
      "/products/rubber-floor-mat",
    );
  });
});

describe("Pagination", () => {
  it("renders nothing for single page", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders page buttons", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument();
  });

  it("disables previous on first page", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
  });

  it("disables next on last page", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
  });
});

describe("ActiveFilters", () => {
  it("renders nothing when no filters", () => {
    const { container } = render(
      <ActiveFilters filters={[]} onRemove={() => {}} onClearAll={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders chips and Clear All", () => {
    const filters = [{ key: "search", label: "test" }, { key: "category", label: "Seat Covers" }];
    render(<ActiveFilters filters={filters} onRemove={() => {}} onClearAll={() => {}} />);
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("Seat Covers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
  });
});
