import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "../../types/api";
import { CategoryStrip } from "./CategoryStrip";

const categories: Category[] = [
  { id: "1", name: "Seat Covers", slug: "seat-covers", description: null, image_url: null, sort_order: 0, is_active: true },
  { id: "2", name: "Floor Mats", slug: "floor-mats", description: null, image_url: "/images/cat.jpg", sort_order: 1, is_active: true },
];

describe("CategoryStrip", () => {
  it("renders an All Categories tile and every category", () => {
    render(
      <CategoryStrip categories={categories} selectedCategory="" onSelect={() => {}} />,
    );
    expect(screen.getByRole("heading", { name: /shop by category/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all categories/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /seat covers/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /floor mats/i })).toBeInTheDocument();
  });

  it("marks the active category as pressed", () => {
    render(
      <CategoryStrip categories={categories} selectedCategory="seat-covers" onSelect={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /seat covers/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /all categories/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("emits the selected category slug", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CategoryStrip categories={categories} selectedCategory="" onSelect={onSelect} />,
    );
    await user.click(screen.getByRole("button", { name: /floor mats/i }));
    expect(onSelect).toHaveBeenCalledWith("floor-mats");
  });

  it("renders nothing when there are no categories", () => {
    const { container } = render(
      <CategoryStrip categories={[]} selectedCategory="" onSelect={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
