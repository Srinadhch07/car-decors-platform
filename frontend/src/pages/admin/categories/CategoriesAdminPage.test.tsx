import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { Category } from "../../../types/api";
import { CategoriesAdminPage } from "./CategoriesAdminPage";

const mockCategories: Category[] = [
  {
    id: "c1",
    name: "Seat Covers",
    slug: "seat-covers",
    description: "Premium seat covers",
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
    is_active: false,
  },
];

interface CapturedRequest {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
}

let captured: CapturedRequest[] = [];
let deleteResponse: Response = new HttpResponse(null, { status: 204 });

const server = setupServer(
  http.get("*/api/admin/categories", () => HttpResponse.json(mockCategories)),
  http.post("*/api/admin/categories", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    captured.push({ method: "POST", url: request.url, body });
    return HttpResponse.json(
      {
        id: "c-new",
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        image_url: body.image_url ?? null,
        sort_order: body.sort_order ?? 0,
        is_active: body.is_active ?? true,
      },
      { status: 201 },
    );
  }),
  http.put("*/api/admin/categories/:id", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    captured.push({ method: "PUT", url: request.url, body });
    return HttpResponse.json({
      ...mockCategories[0],
      id: String(params.id),
      name: body.name,
      slug: body.slug,
    });
  }),
  http.delete("*/api/admin/categories/:id", ({ params, request }) => {
    captured.push({ method: "DELETE", url: request.url, body: null });
    void params;
    return deleteResponse;
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  captured = [];
  deleteResponse = new HttpResponse(null, { status: 204 });
});
afterAll(() => server.close());

function renderPage() {
  return render(<CategoriesAdminPage />, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={["/admin/categories"]}>{children}</TestWrapper>
    ),
  });
}

function getRow(name: string) {
  return screen.getByRole("row", { name: new RegExp(name, "i") });
}

describe("CategoriesAdminPage", () => {
  it("renders heading and lists categories with statuses", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "Categories" }),
    ).toBeInTheDocument();
    expect(getRow("Seat Covers")).toBeInTheDocument();
    expect(getRow("Floor Mats")).toBeInTheDocument();
    expect(screen.getByText("seat-covers")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Hidden")).toBeInTheDocument();
  });

  it("shows an empty state when there are no categories", async () => {
    server.use(http.get("*/api/admin/categories", () => HttpResponse.json([])));
    renderPage();
    expect(await screen.findByText("No categories yet")).toBeInTheDocument();
  });

  it("shows an error state when the list load fails", async () => {
    server.use(
      http.get("*/api/admin/categories", () => HttpResponse.error()),
    );
    renderPage();
    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it("creates a category through the inline form", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Seat Covers");

    await user.click(screen.getByRole("button", { name: /add category/i }));
    await user.type(screen.getByLabelText("Name"), "Ambient Lighting");
    await user.click(screen.getByRole("button", { name: /create category/i }));

    await waitFor(() => {
      expect(captured.find((c) => c.method === "POST")).toBeDefined();
    });
    const post = captured.find((c) => c.method === "POST")!;
    expect(post.body).toMatchObject({
      name: "Ambient Lighting",
      slug: "ambient-lighting",
      is_active: true,
    });
    expect(await screen.findByRole("row", { name: /ambient lighting/i })).toBeInTheDocument();
  });

  it("edits an existing category", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Seat Covers");

    const row = getRow("Seat Covers");
    await user.click(within(row).getByRole("button", { name: /edit/i }));

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveValue("Seat Covers");
    await user.clear(nameInput);
    await user.type(nameInput, "Seat Covers Pro");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      const put = captured.find(
        (c) => c.method === "PUT" && c.url.endsWith("/api/admin/categories/c1"),
      );
      expect(put).toBeDefined();
      expect(put!.body).toMatchObject({ name: "Seat Covers Pro" });
    });
    expect(await screen.findByRole("row", { name: /seat covers pro/i })).toBeInTheDocument();
  });

  it("requires confirmation before deleting", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Seat Covers");

    const row = getRow("Seat Covers");
    await user.click(within(row).getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog", { name: /confirm delete/i });
    expect(within(dialog).getByText(/this cannot be undone/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(captured.filter((c) => c.method === "DELETE")).toHaveLength(0);
    expect(getRow("Seat Covers")).toBeInTheDocument();
  });

  it("deletes a category after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Seat Covers");

    const row = getRow("Seat Covers");
    await user.click(within(row).getByRole("button", { name: /delete/i }));
    const dialog = await screen.findByRole("alertdialog", { name: /confirm delete/i });
    await user.click(within(dialog).getByRole("button", { name: /delete category/i }));

    await waitFor(() => {
      expect(
        captured.find(
          (c) => c.method === "DELETE" && c.url.endsWith("/api/admin/categories/c1"),
        ),
      ).toBeDefined();
    });
    expect(screen.queryByRole("row", { name: /seat covers/i })).not.toBeInTheDocument();
  });

  it("shows a 409 conflict message when deletion is blocked", async () => {
    deleteResponse = HttpResponse.json(
      { detail: "Category has 2 subcategories; delete them first" },
      { status: 409 },
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Seat Covers");

    const row = getRow("Floor Mats");
    await user.click(within(row).getByRole("button", { name: /delete/i }));
    const dialog = await screen.findByRole("alertdialog", { name: /confirm delete/i });
    await user.click(within(dialog).getByRole("button", { name: /delete category/i }));

    expect(
      await within(dialog).findByText(/category has 2 subcategories; delete them first/i),
    ).toBeInTheDocument();
    expect(getRow("Floor Mats")).toBeInTheDocument();
  });
});