import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper, mockShopSettings } from "../../test-utils";
import type { Category, Product } from "../../types/api";
import { ProductDetail } from "./ProductDetail";

const mockCategory: Category = {
  id: "cat-1",
  name: "Seat Covers",
  slug: "seat-covers",
  description: null,
  image_url: null,
  sort_order: 0,
  is_active: true,
};

const mockProduct: Product = {
  id: "1",
  category_id: "cat-1",
  subcategory_id: "sub-1",
  name: "Premium Leather Seat Cover",
  slug: "premium-leather-seat-cover",
  description: "High-quality leather seat cover for premium comfort.",
  price: "2999",
  availability: "IN_STOCK",
  is_active: true,
  vehicle_tags: ["Maruti Swift", "Honda City", "Hyundai Creta"],
  image_url: "/images/products/seat-cover.jpg",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const productNoPrice: Product = {
  ...mockProduct,
  id: "2",
  slug: "basic-floor-mat",
  name: "Basic Floor Mat",
  price: null,
  availability: "ON_ORDER",
  image_url: null,
  vehicle_tags: [],
};

const server = setupServer(
  http.get("*/api/products/:slug", ({ params }) => {
    if (params.slug === "premium-leather-seat-cover") {
      return HttpResponse.json(mockProduct);
    }
    if (params.slug === "basic-floor-mat") {
      return HttpResponse.json(productNoPrice);
    }
    return new HttpResponse(null, { status: 404 });
  }),
  http.get("*/api/categories", () => HttpResponse.json([mockCategory])),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDetail(slug: string) {
  return render(<ProductDetail slug={slug} />, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={[`/products/${slug}`]}>{children}</TestWrapper>
    ),
  });
}

async function waitForProductLoad(name: string) {
  await waitFor(() => {
    expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
  });
}

describe("ProductDetail", () => {
  it("renders product name, price, and description", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    expect(screen.getByRole("heading", { name: "Premium Leather Seat Cover" })).toBeInTheDocument();
    expect(screen.getByText("₹2,999")).toBeInTheDocument();
    expect(screen.getByText("High-quality leather seat cover for premium comfort.")).toBeInTheDocument();
  });

  it("shows In Stock badge", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("shows vehicle tags", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    expect(screen.getByText("Maruti Swift")).toBeInTheDocument();
    expect(screen.getByText("Honda City")).toBeInTheDocument();
    expect(screen.getByText("Hyundai Creta")).toBeInTheDocument();
  });

  it("renders product image", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    const img = screen.getByRole("img", { name: "Premium Leather Seat Cover" });
    expect(img).toHaveAttribute("src", "/images/products/seat-cover.jpg");
  });

  it("shows breadcrumb navigation with category", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    const nav = screen.getByLabelText("Breadcrumb");
    expect(nav).toBeInTheDocument();
    expect(screen.getByText("Home")).toHaveAttribute("href", "/");
    expect(screen.getByText("Products")).toHaveAttribute("href", "/products");
    expect(screen.getByText("Seat Covers")).toHaveAttribute("href", "/categories/seat-covers");
  });

  it("shows WhatsApp enquire button when shop settings have phone", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    const whatsapp = screen.getByRole("link", { name: /enquire on whatsapp/i });
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    expect(whatsapp).toHaveAttribute("href", expect.stringContaining("wa.me/"));
  });

  it("renders 'Contact for price' for null price", async () => {
    renderDetail("basic-floor-mat");
    await waitForProductLoad("Basic Floor Mat");
    expect(screen.getByText("Contact for price")).toBeInTheDocument();
  });

  it("shows On Order badge for ON_ORDER availability", async () => {
    renderDetail("basic-floor-mat");
    await waitForProductLoad("Basic Floor Mat");
    expect(screen.getByText("On Order")).toBeInTheDocument();
  });

  it("hides vehicle tags section when empty", async () => {
    renderDetail("basic-floor-mat");
    await waitForProductLoad("Basic Floor Mat");
    expect(screen.queryByText("Compatible Vehicles")).not.toBeInTheDocument();
  });

  it("shows Back to Products link", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    const backLink = screen.getByRole("link", { name: /back to products/i });
    expect(backLink).toHaveAttribute("href", "/products");
  });

  it("shows error state for 404 product", async () => {
    renderDetail("nonexistent-product");
    await waitFor(() => {
      expect(screen.getByText("Product Not Found")).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    server.use(
      http.get("*/api/products/:slug", () => HttpResponse.error()),
    );
    renderDetail("premium-leather-seat-cover");
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("renders loading skeleton before data loads", () => {
    renderDetail("premium-leather-seat-cover");
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("updates page title with product name", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    await waitFor(() => {
      expect(document.title).toContain("Premium Leather Seat Cover");
    });
  });

  it("includes product name in WhatsApp message URL", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    const whatsapp = screen.getByRole("link", { name: /enquire on whatsapp/i });
    expect(whatsapp.getAttribute("href")).toContain(
      encodeURIComponent("Premium Leather Seat Cover"),
    );
  });

  it("shows fallback image when product has no image", async () => {
    const { container } = renderDetail("basic-floor-mat");
    await waitForProductLoad("Basic Floor Mat");
    const fallbackImg = container.querySelector('img[src="/images/product-fallback.svg"]');
    expect(fallbackImg).toBeInTheDocument();
  });

  it("shows phone CTA when whatsapp is not configured", async () => {
    render(
      <ProductDetail slug="premium-leather-seat-cover" />,
      {
        wrapper: ({ children }) => (
          <TestWrapper
            initialEntries={["/products/premium-leather-seat-cover"]}
            shopState={{
              data: { ...mockShopSettings, whatsapp_number: "" },
              loading: false,
              error: null,
            }}
          >
            {children}
          </TestWrapper>
        ),
      },
    );
    await waitForProductLoad("Premium Leather Seat Cover");
    const phoneLink = screen.getByRole("link", { name: /call us/i });
    expect(phoneLink).toHaveAttribute("href", "tel:+919876543210");
  });

  it("hides phone CTA when whatsapp is configured", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    expect(screen.queryByRole("link", { name: /call us/i })).not.toBeInTheDocument();
  });

  it("CTA buttons have comfortable touch targets", async () => {
    renderDetail("premium-leather-seat-cover");
    await waitForProductLoad("Premium Leather Seat Cover");
    const whatsapp = screen.getByRole("link", { name: /enquire on whatsapp/i });
    expect(whatsapp.className).toContain("py-3");
    expect(whatsapp.className).toContain("px-6");
  });
});
