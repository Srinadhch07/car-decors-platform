import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { GalleryItem, GalleryListPage } from "../../types/api";
import { OurWorkGallery } from "./OurWorkGallery";

function makeItem(overrides: Partial<GalleryItem> = {}): GalleryItem {
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
    ...overrides,
  };
}

function page(items: GalleryItem[], overrides: Partial<GalleryListPage> = {}): GalleryListPage {
  return {
    items,
    page: 1,
    page_size: 12,
    total: items.length,
    total_pages: items.length > 0 ? 1 : 0,
    ...overrides,
  };
}

const imageItem = makeItem({ id: "g1", title: "Gloss ceramic finish" });
const videoItem = makeItem({
  id: "g2",
  title: "Interior walkthrough",
  media_type: "video",
  url: "/media/gallery/walkthrough.mp4",
  mime_type: "video/mp4",
  duration_seconds: 30,
});

let lastGalleryUrl = "";

const server = setupServer(
  http.get("*/api/gallery", ({ request }) => {
    lastGalleryUrl = request.url;
    const mediaType = new URL(request.url).searchParams.get("media_type");
    if (mediaType === "video") return HttpResponse.json(page([videoItem]));
    if (mediaType === "image") return HttpResponse.json(page([imageItem]));
    return HttpResponse.json(page([imageItem, videoItem]));
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastGalleryUrl = "";
});
afterAll(() => server.close());

function renderGallery() {
  return render(<OurWorkGallery />, { wrapper: TestWrapper });
}

describe("OurWorkGallery", () => {
  it("renders published items with their titles", async () => {
    renderGallery();
    expect(await screen.findByText("Gloss ceramic finish")).toBeInTheDocument();
    expect(screen.getByText("Interior walkthrough")).toBeInTheDocument();
  });

  it("badges video items", async () => {
    renderGallery();
    expect(await screen.findByText("Video")).toBeInTheDocument();
  });

  it("requests only videos when the Videos filter is chosen", async () => {
    const user = userEvent.setup();
    renderGallery();
    await screen.findByText("Gloss ceramic finish");

    await user.click(screen.getByRole("button", { name: "Videos" }));

    await waitFor(() => expect(lastGalleryUrl).toContain("media_type=video"));
    expect(await screen.findByText("Interior walkthrough")).toBeInTheDocument();
    expect(screen.queryByText("Gloss ceramic finish")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no items", async () => {
    server.use(http.get("*/api/gallery", () => HttpResponse.json(page([]))));
    renderGallery();
    expect(await screen.findByText("Nothing to show yet")).toBeInTheDocument();
  });

  it("opens a lightbox and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(await screen.findByRole("button", { name: /view gloss ceramic finish/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Gloss ceramic finish");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the lightbox with the close button", async () => {
    const user = userEvent.setup();
    renderGallery();
    await user.click(await screen.findByRole("button", { name: /view interior walkthrough/i }));

    await user.click(screen.getByRole("button", { name: "Close viewer" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
