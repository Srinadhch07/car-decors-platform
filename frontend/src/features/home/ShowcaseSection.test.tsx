import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { GalleryItem, GalleryListPage } from "../../types/api";
import { ShowcaseSection } from "./ShowcaseSection";

function makeItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
  return {
    id: "g1",
    title: "Full interior detail",
    description: "Seat covers and dashboard trim.",
    category: "Interior",
    media_type: "image",
    url: "/media/gallery/one.jpg",
    mime_type: "image/jpeg",
    width: null,
    height: null,
    duration_seconds: null,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function page(items: GalleryItem[]): GalleryListPage {
  return {
    items,
    page: 1,
    page_size: 6,
    total: items.length,
    total_pages: items.length > 0 ? 1 : 0,
  };
}

const handlers = [
  http.get("*/api/gallery/featured", () =>
    HttpResponse.json(
      page([
        makeItem({ id: "g1", title: "Full interior detail" }),
        makeItem({
          id: "g2",
          title: "Polish and ceramic coat",
          media_type: "video",
          url: "/media/gallery/two.mp4",
          mime_type: "video/mp4",
          duration_seconds: 12,
        }),
      ]),
    ),
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderSection() {
  return render(<ShowcaseSection />, { wrapper: TestWrapper });
}

describe("ShowcaseSection", () => {
  it("renders featured gallery items and the section heading", async () => {
    renderSection();
    expect(await screen.findByText("Full interior detail")).toBeInTheDocument();
    expect(screen.getByText("Polish and ceramic coat")).toBeInTheDocument();
    expect(screen.getByText("Our Work")).toBeInTheDocument();
  });

  it("links every card and the call to action to the gallery page", async () => {
    renderSection();
    const cta = await screen.findByRole("link", { name: /view all our work/i });
    expect(cta).toHaveAttribute("href", "/gallery");
    const card = screen.getByRole("link", { name: /view full interior detail/i });
    expect(card).toHaveAttribute("href", "/gallery");
  });

  it("renders nothing when there are no featured items", async () => {
    let fetched = false;
    server.use(
      http.get("*/api/gallery/featured", () => {
        fetched = true;
        return HttpResponse.json(page([]));
      }),
    );
    const { container } = renderSection();
    await waitFor(() => expect(fetched).toBe(true));
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });

  it("renders nothing when the request fails", async () => {
    let fetched = false;
    server.use(
      http.get("*/api/gallery/featured", () => {
        fetched = true;
        return HttpResponse.error();
      }),
    );
    const { container } = renderSection();
    await waitFor(() => expect(fetched).toBe(true));
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
