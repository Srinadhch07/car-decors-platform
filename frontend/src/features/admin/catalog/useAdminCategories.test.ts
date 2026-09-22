import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiRequestError } from "../../../lib/api/client";
import type { Category } from "../../../types/api";
import { useAdminCategories } from "./useAdminCategories";

const alpha: Category = {
  id: "c-alpha",
  name: "Alpha",
  slug: "alpha",
  description: null,
  image_url: null,
  sort_order: 0,
  is_active: true,
};
const beta: Category = {
  id: "c-beta",
  name: "Beta",
  slug: "beta",
  description: null,
  image_url: null,
  sort_order: 0,
  is_active: true,
};
const gamma: Category = {
  id: "c-gamma",
  name: "Gamma",
  slug: "gamma",
  description: "Third",
  image_url: null,
  sort_order: 1,
  is_active: false,
};

let createdPayload: Record<string, unknown> | null = null;
let createdCategory: Category | null = null;
let updatedPayload: Record<string, unknown> | null = null;
let deletedIds: string[] = [];
let deleteResponse: Response = new HttpResponse(null, { status: 204 });

const server = setupServer(
  http.get("*/api/admin/categories", () => HttpResponse.json([gamma, alpha, beta])),
  http.post("*/api/admin/categories", async ({ request }) => {
    createdPayload = (await request.json()) as Record<string, unknown>;
    createdCategory = {
      id: "c-new",
      name: String(createdPayload.name),
      slug: String(createdPayload.slug),
      description: null,
      image_url: null,
      sort_order: Number(createdPayload.sort_order ?? 0),
      is_active: Boolean(createdPayload.is_active),
    };
    return HttpResponse.json(createdCategory, { status: 201 });
  }),
  http.put("*/api/admin/categories/:id", async ({ request, params }) => {
    updatedPayload = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...alpha,
      id: String(params.id),
      name: String(updatedPayload.name ?? alpha.name),
    });
  }),
  http.delete("*/api/admin/categories/:id", ({ params }) => {
    deletedIds.push(String(params.id));
    return deleteResponse;
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  createdPayload = null;
  createdCategory = null;
  updatedPayload = null;
  deletedIds = [];
  deleteResponse = new HttpResponse(null, { status: 204 });
});
afterAll(() => server.close());

describe("useAdminCategories", () => {
  it("loads and sorts categories by sort_order then name", async () => {
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.categories.map((c) => c.name)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  it("accepts a paged { items } list response defensively", async () => {
    server.use(
      http.get("*/api/admin/categories", () =>
        HttpResponse.json({
          items: [beta, alpha],
          page: 1,
          page_size: 100,
          total: 2,
          total_pages: 1,
        }),
      ),
    );
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.categories.map((c) => c.name)).toEqual(["Alpha", "Beta"]);
  });

  it("surfaces load errors", async () => {
    server.use(http.get("*/api/admin/categories", () => HttpResponse.error()));
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/failed to fetch/i);
    expect(result.current.categories).toEqual([]);
  });

  it("creates a category and appends it to the list", async () => {
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: "Lighting", slug: "lighting" });
    });

    expect(createdPayload).toMatchObject({ name: "Lighting", slug: "lighting" });
    expect(result.current.categories.some((c) => c.id === "c-new")).toBe(true);
  });

  it("updates a category in place", async () => {
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update("c-alpha", { name: "Alpha Pro" });
    });

    expect(updatedPayload).toMatchObject({ name: "Alpha Pro" });
    const updated = result.current.categories.find((c) => c.id === "c-alpha");
    expect(updated?.name).toBe("Alpha Pro");
  });

  it("removes a category from the list", async () => {
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("c-alpha");
    });

    expect(deletedIds).toEqual(["c-alpha"]);
    expect(result.current.categories.some((c) => c.id === "c-alpha")).toBe(false);
  });

  it("keeps the row and reports a 409 conflict when deletion is blocked", async () => {
    deleteResponse = HttpResponse.json(
      { detail: "Category has 1 subcategory; delete them first" },
      { status: 409 },
    );
    const { result } = renderHook(() => useAdminCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.remove("c-alpha");
      } catch (err) {
        caught = err;
      }
    });

    expect(caught).toBeInstanceOf(ApiRequestError);
    expect((caught as ApiRequestError).status).toBe(409);
    expect(result.current.categories.some((c) => c.id === "c-alpha")).toBe(true);
    expect(result.current.actionError?.status).toBe(409);
    expect(result.current.actionError?.message).toContain("delete them first");
  });
});