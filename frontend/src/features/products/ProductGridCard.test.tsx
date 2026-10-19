import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Product } from "../../types/api";
import { ProductGridCard } from "./ProductGridCard";

const baseProduct: Product = {
  id: "1",
  category_id: "cat-1",
  subcategory_id: null,
  name: "Leather Seat Cover",
  slug: "leather-seat-cover",
  description: "Premium leather",
  price: "2999",
  availability: "IN_STOCK",
  is_active: true,
  vehicle_tags: ["Swift", "City"],
  image_url: "/images/products/seat-cover.jpg",
  external_url: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

function renderCard(product: Product) {
  return render(<ProductGridCard product={product} />, { wrapper: TestWrapper });
}

describe("ProductGridCard", () => {
  it("renders product name, price and availability", () => {
    renderCard(baseProduct);
    expect(screen.getByText("Leather Seat Cover")).toBeInTheDocument();
    expect(screen.getByText("₹2,999")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("links to the product detail route", () => {
    renderCard(baseProduct);
    expect(
      screen.getByRole("link", { name: /view leather seat cover/i }),
    ).toHaveAttribute("href", "/products/leather-seat-cover");
  });

  it("renders a share button for the product", () => {
    renderCard(baseProduct);
    expect(
      screen.getByRole("button", { name: /share leather seat cover/i }),
    ).toBeInTheDocument();
  });

  it("keeps the share button outside the card link", () => {
    renderCard(baseProduct);
    const link = screen.getByRole("link", { name: /view leather seat cover/i });
    expect(within(link).queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
  });

  it("renders the product image when one exists", () => {
    renderCard(baseProduct);
    expect(
      screen.getByRole("img", { name: "Leather Seat Cover" }),
    ).toHaveAttribute("src", "/images/products/seat-cover.jpg");
  });

  it("falls back to the shipped placeholder when no image is set", () => {
    const { container } = renderCard({ ...baseProduct, image_url: null });
    const fallback = container.querySelector('img[src="/images/product-fallback.svg"]');
    expect(fallback).toBeInTheDocument();
  });

  it("shows 'Contact for price' when the price is null", () => {
    renderCard({ ...baseProduct, price: null });
    expect(screen.getByText("Contact for price")).toBeInTheDocument();
  });

  it("renders vehicle tags when present", () => {
    renderCard(baseProduct);
    expect(screen.getByText(/Swift.*City/)).toBeInTheDocument();
  });
});
