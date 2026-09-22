import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { Category, Subcategory } from "../../../types/api";
import { SubcategoriesAdminPage } from "./SubcategoriesAdminPage";

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
  {
    id: "c2",
    name: "Floor Mats",
    slug: "floor-mats",
    description: null,
    image_url: null,
    sort_order: 1,
    is_active: true,
  },
  {
    id: "c3",
    name: "Lighting",
    slug: "lighting",
    description: null,
    image_url: null,
    sort_order: 2,
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
  {
    id: "s2",
    category_id: "c1",
    name: "Standard",
    slug: "standard",
    image_url: null,
    sort_order: 1,
    is_active: false,
  },
  {
    id: "s3",
    category_id: "c2",
    name: "Rubber",
    slug: "rubber",
    image_url: null,
    sort_order: 0,
    is_active: true,
  },
];

interface CapturedRequest {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
}

let captured: CapturedRequest[] = [];

const server = setupServer(
  http.get("*/api/admin/categories", () => HttpResponse.json(mockCategories)),
  http.get("*/api/admin/subcategories", () => HttpResponse.json(mockSubcategories)),
  http.post("*/api/admin/subcategories", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    captured.push({ method: "POST", url: request.url, body });
    return HttpResponse.json(
      {
        id: "s-new",
        category_id: body.category_id,
        name: body.name,
        slug: body.slug,
        image_url: body.image_url ?? null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
      { status: 201 },
    );
  }),
  http.put("*/api/admin/subcategories/:id", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    captured.push({ method: "PUT", url: request.url, body });
    return HttpResponse.json({
      ...mockSubcategories[0],
      id: String(params.id),
      name: body.name,
      slug: body.slug,
    });
  }),
  http.delete("*/api/admin/subcategories/:id", ({ params, request }) => {
    captured.push({ method: "DELETE", url: request.url, body: null });
    void params;
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  captured = [];
});
afterAll(() => server.close());

function renderPage() {
  return render(<SubcategoriesAdminPage />, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={["/admin/subcategories"]}>{children}</TestWrapper>
    ),
  });
}

function getRow(name: string) {
  return screen.getByRole("row", { name: new RegExp(name, "i") });
}

describe("SubcategoriesAdminPage", () => {
  it("renders heading and lists subcategories with category names", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Subcategories" }),
    ).toBeInTheDocument();
    expect(getRow("Premium")).toBeInTheDocument();
    expect(getRow("Rubber")).toBeInTheDocument();
    expect(
      within(getRow("Premium")).getByText("Seat Covers"),
    ).toBeInTheDocument();
    expect(within(getRow("Rubber")).getByText("Floor Mats")).toBeInTheDocument();
  });

  it("filters subcategories by category", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Premium");

    const filter = screen.getByLabelText("Filter by category");
    await user.selectOptions(filter, "c1");

    expect(getRow("Premium")).toBeInTheDocument();
    expect(getRow("Standard")).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /rubber/i })).not.toBeInTheDocument();
  });

  it("shows an empty state for a category without subcategories", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Premium");

    const filter = screen.getByLabelText("Filter by category");
    await user.selectOptions(filter, "c3");

    expect(await screen.findByText("No subcategories in this category")).toBeInTheDocument();
  });

  it("creates a subcategory under the selected category", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Premium");

    await user.click(screen.getByRole("button", { name: /add subcategory/i }));
    const form = await screen.findByRole("form", { name: /new subcategory/i });

    await user.selectOptions(
      within(form).getByLabelText("Category"),
      "c1",
    );
    await user.type(within(form).getByLabelText("Name"), "Deluxe");
    await user.click(within(form).getByRole("button", { name: /create subcategory/i }));

    await waitFor(() => {
      expect(captured.find((c) => c.method === "POST")).toBeDefined();
    });
    const post = captured.find((c) => c.method === "POST")!;
    expect(post.body).toMatchObject({
      category_id: "c1",
      name: "Deluxe",
      slug: "deluxe",
      is_active: true,
    });
    expect(await screen.findByRole("row", { name: /deluxe/i })).toBeInTheDocument();
  });

  it("edits a subcategory", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Premium");

    const row = getRow("Premium");
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveValue("Premium");
    await user.clear(nameInput);
    await user.type(nameInput, "Premium Plus");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = captured.find(
        (c) => c.method === "PUT" && c.url.endsWith("/api/admin/subcategories/s1"),
      );
      expect(put).toBeDefined();
      expect(put!.body).toMatchObject({ name: "Premium Plus" });
    });
    expect(await screen.findByRole("row", { name: /premium plus/i })).toBeInTheDocument();
  });

  it("deletes a subcategory after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Premium");

    const row = getRow("Standard");
    await user.click(within(row).getByRole("button", { name: /delete/i }));
    const dialog = await screen.findByRole("alertdialog", { name: /confirm delete/i });
    await user.click(
      within(dialog).getByRole("button", { name: /delete subcategory/i }),
    );

    await waitFor(() => {
      expect(
        captured.find(
          (c) => c.method === "DELETE" && c.url.endsWith("/api/admin/subcategories/s2"),
        ),
      ).toBeDefined();
    });
    expect(screen.queryByRole("row", { name: /standard/i })).not.toBeInTheDocument();
  });

  it("shows a 409 conflict when deleting a referenced subcategory", async () => {
    server.use(
      http.delete("*/api/admin/subcategories/:id", ({ params, request }) => {
        captured.push({ method: "DELETE", url: request.url, body: null });
        void params;
        return HttpResponse.json(
          { detail: "Subcategory is referenced by 3 products; delete them first" },
          { status: 409 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Premium");

    const row = getRow("Rubber");
    await user.click(within(row).getByRole("button", { name: /delete/i }));
    const dialog = await screen.findByRole("alertdialog", { name: /confirm delete/i });
    await user.click(
      within(dialog).getByRole("button", { name: /delete subcategory/i }),
    );

    expect(
      await within(dialog).findByText(
        /subcategory is referenced by 3 products; delete them first/i,
      ),
    ).toBeInTheDocument();
    expect(getRow("Rubber")).toBeInTheDocument();
  });
});