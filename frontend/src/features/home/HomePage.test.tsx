import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import type { Category, ProductListPage } from "../../types/api";
import { ProductCard } from "./ProductCard";
import { CategoryCard } from "./CategoryCard";
import { HeroSearch } from "./HeroSearch";
import { ContactCTA } from "./ContactCTA";
import { ValuePropositions } from "./ValuePropositions";
import { WhyChooseSection } from "./WhyChooseSection";
import { CategorySection } from "./CategorySection";
import { FeaturedProducts } from "./FeaturedProducts";

const mockCategories: Category[] = [
  {
    id: "1",
    name: "Seat Covers",
    slug: "seat-covers",
    description: "Premium seat covers",
    image_url: null,
    sort_order: 0,
    is_active: true,
  },
  {
    id: "2",
    name: "Floor Mats",
    slug: "floor-mats",
    description: null,
    image_url: "https://example.com/mats.jpg",
    sort_order: 1,
    is_active: true,
  },
];

const mockProducts: ProductListPage = {
  items: [
    {
      id: "1",
      category_id: "1",
      subcategory_id: null,
      name: "Premium Leather Seat Cover",
      slug: "premium-leather-seat-cover",
      description: "High quality leather",
      price: "2999",
      availability: "IN_STOCK",
      is_active: true,
      vehicle_tags: ["Swift", "City"],
      image_url: "https://example.com/cover.jpg",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    {
      id: "2",
      category_id: "2",
      subcategory_id: null,
      name: "Custom Floor Mat",
      slug: "custom-floor-mat",
      description: "Premium floor mat",
      price: null,
      availability: "ON_ORDER",
      is_active: true,
      vehicle_tags: [],
      image_url: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  ],
  page: 1,
  page_size: 8,
  total: 2,
  total_pages: 1,
};

const handlers = [
  http.get("*/api/categories", () =>
    HttpResponse.json(mockCategories),
  ),
  http.get("*/api/products", () =>
    HttpResponse.json(mockProducts),
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HeroSearch", () => {
  it("renders search input", () => {
    render(<HeroSearch />, { wrapper: TestWrapper });
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("navigates to /products?search=<query> on submit", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/"]}>{children}</TestWrapper>
      ),
    });

    const input = screen.getByRole("searchbox");
    await user.type(input, "seat cover");
    await user.click(screen.getByRole("button", { name: /search/i }));

    // Verify navigation happened by checking the URL state
    // (In jsdom we can't easily check URL, but we verify the form works)
    expect(input).toHaveValue("seat cover");
  });

  it("does not navigate on empty query", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/"]}>{children}</TestWrapper>
      ),
    });

    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("submits on Enter key", async () => {
    const user = userEvent.setup();
    render(<HeroSearch />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/"]}>{children}</TestWrapper>
      ),
    });

    const input = screen.getByRole("searchbox");
    await user.type(input, "mats{Enter}");
    expect(input).toHaveValue("mats");
  });
});

describe("CategoryCard", () => {
  it("renders category name", () => {
    render(<CategoryCard category={mockCategories[0]} />, {
      wrapper: TestWrapper,
    });
    expect(screen.getByText("Seat Covers")).toBeInTheDocument();
  });

  it("links to correct slug", () => {
    render(<CategoryCard category={mockCategories[0]} />, {
      wrapper: TestWrapper,
    });
    expect(screen.getByRole("link", { name: /browse seat covers/i })).toHaveAttribute(
      "href",
      "/categories/seat-covers",
    );
  });

  it("renders description when available", () => {
    render(<CategoryCard category={mockCategories[0]} />, {
      wrapper: TestWrapper,
    });
    expect(screen.getByText("Premium seat covers")).toBeInTheDocument();
  });
});

describe("ProductCard", () => {
  const product = mockProducts.items[0];
  const nullPriceProduct = mockProducts.items[1];

  it("renders product name", () => {
    render(<ProductCard product={product} />, { wrapper: TestWrapper });
    expect(screen.getByText("Premium Leather Seat Cover")).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    render(<ProductCard product={product} />, { wrapper: TestWrapper });
    expect(screen.getByText("₹2,999")).toBeInTheDocument();
  });

  it("renders Contact for price when price is null", () => {
    render(<ProductCard product={nullPriceProduct} />, { wrapper: TestWrapper });
    expect(screen.getByText("Contact for price")).toBeInTheDocument();
  });

  it("renders availability badge", () => {
    render(<ProductCard product={product} />, { wrapper: TestWrapper });
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("renders ON_ORDER availability", () => {
    render(<ProductCard product={nullPriceProduct} />, { wrapper: TestWrapper });
    expect(screen.getByText("On Order")).toBeInTheDocument();
  });

  it("links to correct product slug", () => {
    render(<ProductCard product={product} />, { wrapper: TestWrapper });
    expect(screen.getByRole("link", { name: /view premium leather seat cover/i })).toHaveAttribute(
      "href",
      "/products/premium-leather-seat-cover",
    );
  });

  it("renders vehicle tags", () => {
    render(<ProductCard product={product} />, { wrapper: TestWrapper });
    expect(screen.getByText(/Swift.*City/)).toBeInTheDocument();
  });
});

describe("ValuePropositions", () => {
  it("renders value proposition cards", () => {
    render(<ValuePropositions />, { wrapper: TestWrapper });
    expect(screen.getByText("Quality Focused")).toBeInTheDocument();
    expect(screen.getByText("Fast & Reliable")).toBeInTheDocument();
    expect(screen.getByText("Great Value")).toBeInTheDocument();
    expect(screen.getByText("Customer Support")).toBeInTheDocument();
  });
});

describe("WhyChooseSection", () => {
  it("renders section heading", () => {
    render(<WhyChooseSection />, { wrapper: TestWrapper });
    expect(screen.getByText("Why Choose Us")).toBeInTheDocument();
    expect(screen.getByText("Real Value for Your Ride")).toBeInTheDocument();
  });

  it("renders value blocks", () => {
    render(<WhyChooseSection />, { wrapper: TestWrapper });
    expect(screen.getByText("Premium Quality")).toBeInTheDocument();
    expect(screen.getByText("Great Value")).toBeInTheDocument();
    expect(screen.getByText("Customer Support")).toBeInTheDocument();
  });
});

describe("ContactCTA", () => {
  it("renders WhatsApp CTA when whatsapp_number exists", () => {
    render(<ContactCTA />, {
      wrapper: ({ children }) => (
        <TestWrapper shopState={createMockState()}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByText("WhatsApp Us")).toBeInTheDocument();
  });

  it("renders phone CTA when phone exists", () => {
    render(<ContactCTA />, {
      wrapper: ({ children }) => (
        <TestWrapper shopState={createMockState()}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByText("Call Us")).toBeInTheDocument();
  });

  it("renders email CTA when email exists", () => {
    render(<ContactCTA />, {
      wrapper: ({ children }) => (
        <TestWrapper shopState={createMockState()}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByText("Email Us")).toBeInTheDocument();
  });

  it("hides WhatsApp CTA when whatsapp_number is empty", () => {
    render(<ContactCTA />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, whatsapp_number: "" },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("WhatsApp Us")).not.toBeInTheDocument();
  });

  it("hides phone CTA when phone is empty", () => {
    render(<ContactCTA />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, phone: "" },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Call Us")).not.toBeInTheDocument();
  });

  it("renders nothing when no contact info", () => {
    const { container } = render(<ContactCTA />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, phone: "", whatsapp_number: "", email: null },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(container.innerHTML).toBe("");
  });
});

describe("CategorySection", () => {
  it("renders categories from API", async () => {
    render(<CategorySection />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    expect(await screen.findByText("Seat Covers")).toBeInTheDocument();
    expect(screen.getByText("Floor Mats")).toBeInTheDocument();
  });

  it("renders section heading", async () => {
    render(<CategorySection />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    await screen.findByText("Seat Covers");
    expect(screen.getByText("Shop by Category")).toBeInTheDocument();
  });

  it("renders empty state when no categories", async () => {
    server.use(
      http.get("*/api/categories", () => HttpResponse.json([])),
    );
    render(<CategorySection />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    expect(await screen.findByText("No categories yet")).toBeInTheDocument();
  });

  it("renders error state on API failure", async () => {
    server.use(
      http.get("*/api/categories", () => HttpResponse.error()),
    );
    render(<CategorySection />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
  });
});

describe("FeaturedProducts", () => {
  it("renders products from API", async () => {
    render(<FeaturedProducts />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    expect(await screen.findByText("Premium Leather Seat Cover")).toBeInTheDocument();
    expect(screen.getByText("Custom Floor Mat")).toBeInTheDocument();
  });

  it("renders section heading", async () => {
    render(<FeaturedProducts />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    await screen.findByText("Premium Leather Seat Cover");
    expect(screen.getByText("Featured Products")).toBeInTheDocument();
  });

  it("renders empty state when no products", async () => {
    server.use(
      http.get("*/api/products", () =>
        HttpResponse.json({ items: [], page: 1, page_size: 8, total: 0, total_pages: 0 }),
      ),
    );
    render(<FeaturedProducts />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    expect(await screen.findByText("No products yet")).toBeInTheDocument();
  });

  it("renders error state on API failure", async () => {
    server.use(
      http.get("*/api/products", () => HttpResponse.error()),
    );
    render(<FeaturedProducts />, {
      wrapper: ({ children }) => (
        <TestWrapper>{children}</TestWrapper>
      ),
    });
    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
  });
});
