import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type {
  Category,
  Product,
  ProductAdminListPage,
  ProductAvailability,
  Subcategory,
} from "../../../types/api";
import { ProductsAdminPage } from "./ProductsAdminPage";

// ─── Mock data ───

const mockCategories: Category[] = [
  { id: "cat-1", name: "Seat Covers", slug: "seat-covers", description: null, image_url: null, sort_order: 0, is_active: true },
  { id: "cat-2", name: "Floor Mats", slug: "floor-mats", description: null, image_url: null, sort_order: 1, is_active: true },
];

const mockSubcategories: Subcategory[] = [
  { id: "sub-1", category_id: "cat-1", name: "Premium", slug: "premium", image_url: null, sort_order: 0, is_active: true },
];

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    category_id: "cat-1",
    subcategory_id: "sub-1",
    name: "Leather Seat Cover",
    slug: "leather-seat-cover",
    description: "Premium leather",
    price: "2999",
    availability: "IN_STOCK",
    is_active: true,
    vehicle_tags: ["Swift", "City"],
    image_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

let mockProducts: Product[] = [
  makeProduct({
    id: "prod-1",
    name: "Leather Seat Cover",
    price: "2999",
    availability: "IN_STOCK",
    is_active: true,
  }),
  makeProduct({
    id: "prod-2",
    name: "Rubber Floor Mat",
    slug: "rubber-floor-mat",
    category_id: "cat-2",
    subcategory_id: null,
    price: null,
    availability: "ON_ORDER",
    is_active: false,
  }),
];

function listPage(items: Product[], page = 1, total?: number): ProductAdminListPage {
  return {
    items,
    page,
    page_size: 10,
    total: total ?? items.length,
    total_pages: Math.max(1, Math.ceil((total ?? items.length) / 10)),
  };
}

// ─── MSW Server ───

let lastListUrl = "";
let lastDeleteId: string | null = null;

const handlers = [
  http.get("*/api/categories", () => HttpResponse.json(mockCategories)),
  http.get("*/api/categories/:slug/subcategories", () => HttpResponse.json(mockSubcategories)),
  http.get("*/api/admin/products", ({ request }) => {
    lastListUrl = new URL(request.url).search;
    return HttpResponse.json(listPage(mockProducts));
  }),
  http.put("*/api/admin/products/:id", async ({ params, request }) => {
    const id = String(params.id);
    const form = await request.formData();
    const index = mockProducts.findIndex((p) => p.id === id);
    const current = mockProducts[index];
    if (!current) return new HttpResponse(null, { status: 404 });
    const next: Product = { ...current };
    if (form.has("availability")) {
      next.availability = String(form.get("availability")) as ProductAvailability;
    }
    if (form.has("is_active")) {
      next.is_active = form.get("is_active") === "true";
    }
    mockProducts[index] = next;
    return HttpResponse.json(next);
  }),
  http.delete("*/api/admin/products/:id", ({ params }) => {
    const id = String(params.id);
    lastDeleteId = id;
    mockProducts = mockProducts.filter((p) => p.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastListUrl = "";
  lastDeleteId = null;
  mockProducts = [
    makeProduct({
      id: "prod-1",
      name: "Leather Seat Cover",
      price: "2999",
      availability: "IN_STOCK",
      is_active: true,
    }),
    makeProduct({
      id: "prod-2",
      name: "Rubber Floor Mat",
      slug: "rubber-floor-mat",
      category_id: "cat-2",
      subcategory_id: null,
      price: null,
      availability: "ON_ORDER",
      is_active: false,
    }),
  ];
});
afterAll(() => server.close());

function renderPage(initialEntries: string[] = ["/admin/products"]) {
  return render(<ProductsAdminPage />, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={initialEntries}>{children}</TestWrapper>
    ),
  });
}

// ─── Tests ───

describe("ProductsAdminPage", () => {
  it("renders the page heading and product rows", async () => {
    renderPage();
    expect(await screen.findByText("Leather Seat Cover")).toBeInTheDocument();
    expect(screen.getByText("Rubber Floor Mat")).toBeInTheDocument();
    expect(screen.getByText("₹2,999")).toBeInTheDocument();
    expect(screen.getByText("Contact for price")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
  });

  it("shows category and subcategory names", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    const row = screen.getByText("Leather Seat Cover").closest("tr") as HTMLTableRowElement;
    expect(within(row).getByText("Seat Covers")).toBeInTheDocument();
    expect(await within(row).findByText("Premium")).toBeInTheDocument();
  });

  it("renders Add Product link", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    expect(screen.getByRole("link", { name: /add product/i })).toHaveAttribute(
      "href",
      "/admin/products/new",
    );
  });

  it("shows empty state when no products", async () => {
    server.use(
      http.get("*/api/admin/products", () =>
        HttpResponse.json({ items: [], page: 1, page_size: 10, total: 0, total_pages: 0 }),
      ),
    );
    renderPage();
    expect(await screen.findByText("No products found")).toBeInTheDocument();
  });

  it("submits search and refetches with search param", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const input = screen.getByRole("searchbox", { name: /search products/i });
    await user.clear(input);
    await user.type(input, "leather");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(lastListUrl).toContain("search=leather");
    });
  });

  it("category filter updates the URL and loads subcategories", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const categorySelect = document.getElementById("admin-filter-category") as HTMLSelectElement;
    await user.selectOptions(categorySelect, "seat-covers");

    await waitFor(() => {
      expect(lastListUrl).toContain("category=seat-covers");
    });
    const subcategorySelect = document.getElementById(
      "admin-filter-subcategory",
    ) as HTMLSelectElement;
    expect(subcategorySelect.querySelector('option[value="premium"]')).toBeInTheDocument();
  });

  it("availability filter updates the URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const select = document.getElementById("admin-filter-availability") as HTMLSelectElement;
    await user.selectOptions(select, "OUT_OF_STOCK");

    await waitFor(() => {
      expect(lastListUrl).toContain("availability=OUT_OF_STOCK");
    });
  });

  it("active filter updates the URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const select = document.getElementById("admin-filter-active") as HTMLSelectElement;
    await user.selectOptions(select, "inactive");

    await waitFor(() => {
      expect(lastListUrl).toContain("is_active=false");
    });
  });

  it("clears filters", async () => {
    const user = userEvent.setup();
    renderPage([
      "/admin/products?search=leather&category=seat-covers&availability=IN_STOCK&active=active",
    ]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    await waitFor(() => {
      expect(lastListUrl).not.toContain("search=");
      expect(lastListUrl).not.toContain("category=");
      expect(lastListUrl).not.toContain("availability=");
      expect(lastListUrl).not.toContain("is_active=");
    });
  });

  it("passes expected query params to the API", async () => {
    renderPage([
      "/admin/products?search=seat&category=seat-covers&subcategory=premium&availability=IN_STOCK&active=active&sort=price_asc&page=1",
    ]);
    await waitFor(() => {
      expect(lastListUrl).toContain("search=seat");
      expect(lastListUrl).toContain("category=seat-covers");
      expect(lastListUrl).toContain("subcategory=premium");
      expect(lastListUrl).toContain("availability=IN_STOCK");
      expect(lastListUrl).toContain("is_active=true");
      expect(lastListUrl).toContain("sort=price_asc");
    });
  });

  it("paginates and preserves URL parameters", async () => {
    server.use(
      http.get("*/api/admin/products", ({ request }) => {
        lastListUrl = new URL(request.url).search;
        return HttpResponse.json(listPage(mockProducts, 1, 40));
      }),
    );
    const user = userEvent.setup();
    renderPage(["/admin/products?category=seat-covers"]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => {
      expect(lastListUrl).toContain("page=2");
      expect(lastListUrl).toContain("category=seat-covers");
    });
  });

  it("edits availability inline via PUT", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const availabilitySelect = screen.getByLabelText("Availability for Leather Seat Cover");
    expect(availabilitySelect).toHaveValue("IN_STOCK");

    await user.selectOptions(availabilitySelect, "OUT_OF_STOCK");

    await waitFor(() => {
      expect(availabilitySelect).toHaveValue("OUT_OF_STOCK");
    });
  });

  it("surfaces an error when the availability update fails", async () => {
    server.use(
      http.put("*/api/admin/products/:id", () =>
        HttpResponse.json({ detail: "Update rejected" }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const availabilitySelect = screen.getByLabelText("Availability for Leather Seat Cover");
    await user.selectOptions(availabilitySelect, "ON_ORDER");

    expect(await screen.findByRole("alert")).toHaveTextContent("Update rejected");
  });

  it("toggles the active state via PUT", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const toggle = screen.getByRole("switch", { name: /toggle active state for leather seat cover/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
    expect(within(toggle).getByText("Inactive")).toBeInTheDocument();
  });

  it("deletes a product after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /delete leather seat cover/i }));
    const dialog = await screen.findByRole("dialog", { name: /delete product/i });
    expect(within(dialog).getByText(/leather seat cover/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(lastDeleteId).toBe("prod-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("Leather Seat Cover")).not.toBeInTheDocument();
    });
  });

  it("cancels delete without calling the API", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /delete leather seat cover/i }));
    await screen.findByRole("dialog", { name: /delete product/i });

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /delete product/i })).not.toBeInTheDocument();
    });
    expect(lastDeleteId).toBeNull();
  });

  it("surfaces a 409 error when delete is blocked", async () => {
    server.use(
      http.delete("*/api/admin/products/:id", ({ params }) => {
        lastDeleteId = String(params.id);
        return HttpResponse.json(
          { detail: "Cannot delete product because it has active orders" },
          { status: 409 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /delete leather seat cover/i }));
    const dialog = await screen.findByRole("dialog", { name: /delete product/i });
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot delete product because it has active orders",
    );
    expect(screen.getByText("Leather Seat Cover")).toBeInTheDocument();
    expect(lastDeleteId).toBe("prod-1");
  });

  it("shows an error state when the listing fails", async () => {
    server.use(
      http.get("*/api/admin/products", () => HttpResponse.error()),
    );
    renderPage();
    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("links to the edit page for each product", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    expect(screen.getByRole("link", { name: /edit leather seat cover/i })).toHaveAttribute(
      "href",
      "/admin/products/prod-1/edit",
    );
  });

  it("renders the availability select as a labelled control (a11y)", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    expect(screen.getByLabelText("Availability for Rubber Floor Mat")).toHaveValue("ON_ORDER");
    expect(screen.getByRole("switch", { name: /toggle active state for rubber floor mat/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("keeps the row state after an inline availability edit", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    const availabilitySelect = screen.getByLabelText("Availability for Leather Seat Cover");
    await user.selectOptions(availabilitySelect, "ON_ORDER");

    await waitFor(() => {
      expect(availabilitySelect).toHaveValue("ON_ORDER");
    });
    const row = availabilitySelect.closest("tr") as HTMLTableRowElement;
    expect(within(row).getByText("Leather Seat Cover")).toBeInTheDocument();
  });

  it("sends the availability change as multipart form data", async () => {
    let sentAvailability: string | null = null;
    server.use(
      http.put("*/api/admin/products/:id", async ({ params, request }) => {
        const id = String(params.id);
        const form = await request.formData();
        sentAvailability = String(form.get("availability"));
        const current = mockProducts.find((p) => p.id === id)!;
        const next: Product = { ...current, availability: sentAvailability as ProductAvailability };
        mockProducts = mockProducts.map((p) => (p.id === id ? next : p));
        return HttpResponse.json(next);
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Leather Seat Cover");

    await user.selectOptions(
      screen.getByLabelText("Availability for Leather Seat Cover"),
      "OUT_OF_STOCK",
    );

    await waitFor(() => {
      expect(sentAvailability).toBe("OUT_OF_STOCK");
    });
  });

  it("resets page to 1 when applying a filter", async () => {
    server.use(
      http.get("*/api/admin/products", ({ request }) => {
        lastListUrl = new URL(request.url).search;
        return HttpResponse.json(listPage(mockProducts, 1, 40));
      }),
    );
    const user = userEvent.setup();
    renderPage(["/admin/products?page=2"]);
    await screen.findByText("Leather Seat Cover");

    const categorySelect = document.getElementById("admin-filter-category") as HTMLSelectElement;
    await user.selectOptions(categorySelect, "floor-mats");

    await waitFor(() => {
      expect(lastListUrl).toContain("category=floor-mats");
      expect(lastListUrl).not.toContain("page=2");
    });
  });

  it("clears search via the clear button", async () => {
    const user = userEvent.setup();
    renderPage(["/admin/products?search=seat"]);
    await screen.findByText("Leather Seat Cover");

    await user.click(screen.getByRole("button", { name: /clear search/i }));

    await waitFor(() => {
      expect(lastListUrl).not.toContain("search=");
    });
    expect(screen.getByRole("searchbox", { name: /search products/i })).toHaveValue("");
  });

  it("shows result count", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    expect(await screen.findByText("2 products")).toBeInTheDocument();
  });
});

describe("ProductsAdminPage fireEvent helpers", () => {
  it("reacts to availability change via fireEvent", async () => {
    renderPage();
    await screen.findByText("Leather Seat Cover");
    const availabilitySelect = screen.getByLabelText("Availability for Leather Seat Cover");
    await waitFor(() => {
      expect(availabilitySelect).toHaveValue("IN_STOCK");
    });
    fireEvent.change(availabilitySelect, { target: { value: "ON_ORDER" } });
    await waitFor(() => {
      expect(availabilitySelect).toHaveValue("ON_ORDER");
    });
  });
});