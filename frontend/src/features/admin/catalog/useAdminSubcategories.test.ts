import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiRequestError } from "../../../lib/api/client";
import type { Subcategory } from "../../../types/api";
import { useAdminSubcategories } from "./useAdminSubcategories";

const premium: Subcategory = {
  id: "s-premium",
  category_id: "c1",
  name: "Premium",
  slug: "premium",
  image_url: null,
  sort_order: 0,
  is_active: true,
};
const standard: Subcategory = {
  id: "s-standard",
  category_id: "c1",
  name: "Standard",
  slug: "standard",
  image_url: null,
  sort_order: 1,
  is_active: false,
};

let createdPayload: Record<string, unknown> | null = null;
let updatedPayload: Record<string, unknown> | null = null;
let deletedIds: string[] = [];
let deleteResponse: Response = new HttpResponse(null, { status: 204 });

const server = setupServer(
  http.get("*/api/admin/subcategories", () => HttpResponse.json([standard, premium])),
  http.post("*/api/admin/subcategories", async ({ request }) => {
    createdPayload = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: "s-new",
        category_id: String(createdPayload.category_id),
        name: String(createdPayload.name),
        slug: String(createdPayload.slug),
        image_url: null,
        sort_order: Number(createdPayload.sort_order ?? 0),
        is_active: Boolean(createdPayload.is_active),
      },
      { status: 201 },
    );
  }),
  http.put("*/api/admin/subcategories/:id", async ({ request, params }) => {
    updatedPayload = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...premium,
      id: String(params.id),
      name: String(updatedPayload.name ?? premium.name),
    });
  }),
  http.delete("*/api/admin/subcategories/:id", ({ params }) => {
    deletedIds.push(String(params.id));
    return deleteResponse;
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  createdPayload = null;
  updatedPayload = null;
  deletedIds = [];
  deleteResponse = new HttpResponse(null, { status: 204 });
});
afterAll(() => server.close());

describe("useAdminSubcategories", () => {
  it("loads and sorts subcategories", async () => {
    const { result } = renderHook(() => useAdminSubcategories());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subcategories.map((s) => s.name)).toEqual([
      "Premium",
      "Standard",
    ]);
  });

  it("creates a subcategory with a category_id", async () => {
    const { result } = renderHook(() => useAdminSubcategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ category_id: "c1", name: "Deluxe", slug: "deluxe" });
    });

    expect(createdPayload).toMatchObject({
      category_id: "c1",
      name: "Deluxe",
      slug: "deluxe",
    });
    expect(result.current.subcategories.some((s) => s.id === "s-new")).toBe(true);
  });

  it("updates a subcategory in place", async () => {
    const { result } = renderHook(() => useAdminSubcategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update("s-premium", { name: "Premium Plus" });
    });

    expect(updatedPayload).toMatchObject({ name: "Premium Plus" });
    const updated = result.current.subcategories.find((s) => s.id === "s-premium");
    expect(updated?.name).toBe("Premium Plus");
  });

  it("removes a subcategory from the list", async () => {
    const { result } = renderHook(() => useAdminSubcategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove("s-standard");
    });

    expect(deletedIds).toEqual(["s-standard"]);
    expect(
      result.current.subcategories.some((s) => s.id === "s-standard"),
    ).toBe(false);
  });

  it("keeps the row and reports a 409 conflict when deletion is blocked", async () => {
    deleteResponse = HttpResponse.json(
      { detail: "Subcategory is referenced by 2 products; delete them first" },
      { status: 409 },
    );
    const { result } = renderHook(() => useAdminSubcategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.remove("s-premium");
      } catch (err) {
        caught = err;
      }
    });

    expect(caught).toBeInstanceOf(ApiRequestError);
    expect((caught as ApiRequestError).status).toBe(409);
    expect(result.current.subcategories.some((s) => s.id === "s-premium")).toBe(true);
    expect(result.current.actionError?.status).toBe(409);
    expect(result.current.actionError?.message).toContain("delete them first");
  });
});