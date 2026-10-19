import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TestWrapper } from "../../../test-utils";
import { api } from "../../../lib/api/client";
import type { AdminGalleryItem, AdminGalleryListPage } from "../../../types/api";
import { GalleryAdminPage } from "./GalleryAdminPage";

function makeItem(overrides: Partial<AdminGalleryItem> = {}): AdminGalleryItem {
  return {
    id: "g1",
    title: "Gloss ceramic finish",
    description: "Full body ceramic coating.",
    category: "Exterior",
    media_type: "image",
    url: "/media/gallery/finish.jpg",
    mime_type: "image/jpeg",
    width: null,
    height: null,
    duration_seconds: null,
    created_at: "2024-01-01T00:00:00Z",
    storage_key: "gallery/finish.jpg",
    size_bytes: 2048,
    is_published: false,
    is_featured: false,
    display_order: 0,
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function adminPage(items: AdminGalleryItem[]): AdminGalleryListPage {
  return { items, page: 1, page_size: 10, total: items.length, total_pages: 1 };
}

let mockItems: AdminGalleryItem[] = [];
let lastListUrl = "";
let lastPublicationBody: { is_published: boolean } | null = null;
let deleteCalled = false;

function updateItem(id: string, patch: Partial<AdminGalleryItem>): AdminGalleryItem {
  const index = mockItems.findIndex((item) => item.id === id);
  const next = { ...mockItems[index], ...patch };
  mockItems[index] = next;
  return next;
}

const handlers = [
  http.get("*/api/admin/gallery", ({ request }) => {
    lastListUrl = request.url;
    return HttpResponse.json(adminPage(mockItems));
  }),
  http.patch("*/api/admin/gallery/:id/publication", async ({ params, request }) => {
    lastPublicationBody = (await request.json()) as { is_published: boolean };
    const patch: Partial<AdminGalleryItem> = { is_published: lastPublicationBody.is_published };
    if (!lastPublicationBody.is_published) patch.is_featured = false;
    return HttpResponse.json(updateItem(String(params.id), patch));
  }),
  http.patch("*/api/admin/gallery/:id/feature", async ({ params, request }) => {
    const body = (await request.json()) as { is_featured: boolean };
    return HttpResponse.json(updateItem(String(params.id), { is_featured: body.is_featured }));
  }),
  http.delete("*/api/admin/gallery/:id", ({ params }) => {
    deleteCalled = true;
    mockItems = mockItems.filter((item) => item.id !== String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
beforeEach(() => {
  mockItems = [makeItem()];
  lastListUrl = "";
  lastPublicationBody = null;
  deleteCalled = false;
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function renderPage() {
  return render(<GalleryAdminPage />, { wrapper: TestWrapper });
}

describe("GalleryAdminPage", () => {
  it("lists gallery items with their draft status", async () => {
    renderPage();
    expect(await screen.findByText("Gloss ceramic finish")).toBeInTheDocument();
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
    expect(lastListUrl).toContain("page_size=10");
  });

  it("disables featuring a draft item", async () => {
    renderPage();
    const feature = await screen.findByRole("button", { name: /feature gloss ceramic finish/i });
    expect(feature).toBeDisabled();
  });

  it("publishes a draft through the publication endpoint", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /publish gloss ceramic finish/i }));

    await waitFor(() => expect(lastPublicationBody?.is_published).toBe(true));
    expect(await screen.findAllByText("Published")).not.toHaveLength(0);
  });

  it("deletes an item after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /delete gloss ceramic finish/i }));

    const dialog = screen.getByRole("dialog", { name: "Delete gallery item" });
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deleteCalled).toBe(true));
  });

  it("uploads a single file through the create endpoint", async () => {
    const user = userEvent.setup();
    const createSpy = vi
      .spyOn(api, "adminCreateGallery")
      .mockImplementation(async (_payload, file) => {
        const created = makeItem({
          id: "new-1",
          title: file.name.replace(/\.[^.]+$/, ""),
        });
        mockItems = [created, ...mockItems];
        return created;
      });
    renderPage();
    await screen.findByText("Gloss ceramic finish");

    const input = screen.getByLabelText(/choose files/i);
    const file = new File(["data"], "fresh-upload.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    await user.click(await screen.findByRole("button", { name: /upload 1 file/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    expect(createSpy.mock.calls[0][1]).toBe(file);
    expect(await screen.findByText("fresh-upload")).toBeInTheDocument();
  });
});
