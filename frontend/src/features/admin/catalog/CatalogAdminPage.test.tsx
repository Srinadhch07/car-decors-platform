import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { Category, Subcategory } from "../../../types/api";
import CatalogAdminPage from "./CatalogAdminPage";

const mockCategories: Category[] = [
  {
    id: "c1",
    name: "Seat Covers",
    slug: "seat-covers",
    description: null,
    image_url: null,
    sort_order: 0,
    is_active: true,
  },
];

const mockSubcategories: Subcategory[] = [
  {
    id: "s1",
    category_id: "c1",
    name: "Premium",
    slug: "premium",
    image_url: null,
    sort_order: 0,
    is_active: true,
  },
];

const server = setupServer(
  http.get("*/api/admin/categories", () => HttpResponse.json(mockCategories)),
  http.get("*/api/admin/subcategories", () => HttpResponse.json(mockSubcategories)),
  http.post("*/api/admin/categories", () => new HttpResponse(null, { status: 201 })),
  http.post("*/api/admin/subcategories", () => new HttpResponse(null, { status: 201 })),
  http.put("*/api/admin/categories/:id", () => new HttpResponse(null, { status: 200 })),
  http.put("*/api/admin/subcategories/:id", () => new HttpResponse(null, { status: 200 })),
  http.delete("*/api/admin/categories/:id", () => new HttpResponse(null, { status: 204 })),
  http.delete("*/api/admin/subcategories/:id", () => new HttpResponse(null, { status: 204 })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CatalogAdminPage", () => {
  it("defaults to the categories tab and switches to subcategories", async () => {
    const user = userEvent.setup();
    render(<CatalogAdminPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/admin/catalog"]}>{children}</TestWrapper>
      ),
    });

    expect(
      await screen.findByRole("heading", { name: "Categories" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Seat Covers")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Subcategories" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Subcategories" }));

    expect(
      await screen.findByRole("heading", { name: "Subcategories" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });
});