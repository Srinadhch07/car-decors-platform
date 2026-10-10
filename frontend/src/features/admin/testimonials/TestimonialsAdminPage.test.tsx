import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type {
  AdminTestimonial,
  AdminTestimonialListPage,
  TestimonialStatus,
} from "../../../types/api";
import { TestimonialsAdminPage } from "./TestimonialsAdminPage";

function makeTestimonial(overrides: Partial<AdminTestimonial> = {}): AdminTestimonial {
  return {
    id: "t1",
    customer_name: "Asha Rao",
    text: "Great service and quality.",
    rating: 5,
    status: "pending",
    published: false,
    is_featured: false,
    consent: true,
    moderation_note: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function adminPage(items: AdminTestimonial[]): AdminTestimonialListPage {
  return {
    items,
    page: 1,
    page_size: 10,
    total: items.length,
    total_pages: 1,
  };
}

let mockItems: AdminTestimonial[] = [];
let lastListUrl = "";
let lastStatusBody: unknown = null;
let lastPublicationBody: unknown = null;
let lastFeatureBody: unknown = null;

function updateItem(id: string, patch: Partial<AdminTestimonial>): AdminTestimonial {
  const index = mockItems.findIndex((item) => item.id === id);
  const next = { ...mockItems[index], ...patch };
  mockItems[index] = next;
  return next;
}

const handlers = [
  http.get("*/api/admin/testimonials", ({ request }) => {
    lastListUrl = request.url;
    const status = new URL(request.url).searchParams.get("status");
    const items = status ? mockItems.filter((item) => item.status === status) : mockItems;
    return HttpResponse.json(adminPage(items));
  }),
  http.patch("*/api/admin/testimonials/:id/status", async ({ params, request }) => {
    lastStatusBody = await request.json();
    return HttpResponse.json(
      updateItem(String(params.id), { status: (lastStatusBody as { status: TestimonialStatus }).status }),
    );
  }),
  http.patch("*/api/admin/testimonials/:id/publication", async ({ params, request }) => {
    lastPublicationBody = await request.json();
    return HttpResponse.json(
      updateItem(String(params.id), {
        published: (lastPublicationBody as { published: boolean }).published,
      }),
    );
  }),
  http.patch("*/api/admin/testimonials/:id/feature", async ({ params, request }) => {
    lastFeatureBody = await request.json();
    return HttpResponse.json(
      updateItem(String(params.id), {
        is_featured: (lastFeatureBody as { is_featured: boolean }).is_featured,
      }),
    );
  }),
  http.put("*/api/admin/testimonials/:id", async ({ params, request }) => {
    const body = (await request.json()) as Partial<AdminTestimonial>;
    return HttpResponse.json(updateItem(String(params.id), body));
  }),
  http.delete("*/api/admin/testimonials/:id", ({ params }) => {
    mockItems = mockItems.filter((item) => item.id !== String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
beforeEach(() => {
  mockItems = [
    makeTestimonial({ id: "t1", customer_name: "Asha Rao" }),
    makeTestimonial({
      id: "t2",
      customer_name: "Vikram Shah",
      text: "Excellent fitting and finish.",
      status: "approved",
      published: true,
    }),
  ];
});
afterEach(() => {
  server.resetHandlers();
  lastListUrl = "";
  lastStatusBody = null;
  lastPublicationBody = null;
  lastFeatureBody = null;
});
afterAll(() => server.close());

function renderPage() {
  return render(<TestimonialsAdminPage />, { wrapper: TestWrapper });
}

function rowFor(name: string): HTMLElement {
  const cell = screen.getByText(name);
  return cell.closest("tr") as HTMLElement;
}

describe("TestimonialsAdminPage", () => {
  it("renders testimonial rows from the API", async () => {
    renderPage();
    expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Vikram Shah")).toBeInTheDocument();
    expect(screen.getByText("2 testimonials")).toBeInTheDocument();
  });

  it("shows the empty state when there are no testimonials", async () => {
    mockItems = [];
    renderPage();
    expect(await screen.findByText("No testimonials found")).toBeInTheDocument();
  });

  it("filters by status through the query string", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Asha Rao");

    await user.selectOptions(screen.getByLabelText(/filter by status/i), "approved");

    await waitFor(() => {
      expect(new URL(lastListUrl).searchParams.get("status")).toBe("approved");
    });
    expect(await screen.findByText("Vikram Shah")).toBeInTheDocument();
    expect(screen.queryByText("Asha Rao")).not.toBeInTheDocument();
  });

  it("approves a pending testimonial", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Asha Rao");

    await user.click(
      within(rowFor("Asha Rao")).getByRole("button", {
        name: /approve testimonial from asha rao/i,
      }),
    );

    await waitFor(() => {
      expect(lastStatusBody).toEqual({ status: "approved" });
    });
    expect(within(rowFor("Asha Rao")).getByText("Approved")).toBeInTheDocument();
  });

  it("toggles publication of a testimonial", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Asha Rao");

    await user.click(
      within(rowFor("Asha Rao")).getByRole("button", {
        name: /publish testimonial from asha rao/i,
      }),
    );

    await waitFor(() => {
      expect(lastPublicationBody).toEqual({ published: true });
    });
    const row = rowFor("Asha Rao");
    expect(within(row).getByText("Published")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: /unpublish testimonial from asha rao/i }),
    ).toBeInTheDocument();
  });

  it("disables featuring until a testimonial is approved, published, and consented", async () => {
    renderPage();
    await screen.findByText("Asha Rao");

    expect(
      within(rowFor("Asha Rao")).getByRole("button", {
        name: /feature testimonial from asha rao/i,
      }),
    ).toBeDisabled();
    expect(
      within(rowFor("Vikram Shah")).getByRole("button", {
        name: /feature testimonial from vikram shah/i,
      }),
    ).toBeEnabled();
  });

  it("features an eligible testimonial", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Vikram Shah");

    await user.click(
      within(rowFor("Vikram Shah")).getByRole("button", {
        name: /feature testimonial from vikram shah/i,
      }),
    );

    await waitFor(() => {
      expect(lastFeatureBody).toEqual({ is_featured: true });
    });
    const row = rowFor("Vikram Shah");
    expect(within(row).getByText("Featured")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: /unfeature testimonial from vikram shah/i }),
    ).toBeInTheDocument();
  });

  it("edits a testimonial through the dialog", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Asha Rao");

    await user.click(
      within(rowFor("Asha Rao")).getByRole("button", {
        name: /edit testimonial from asha rao/i,
      }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Edit testimonial" });
    const nameInput = within(dialog).getByLabelText(/customer name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Asha R.");
    await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Asha R.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Edit testimonial" })).not.toBeInTheDocument();
  });

  it("deletes a testimonial after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Asha Rao");

    await user.click(
      within(rowFor("Asha Rao")).getByRole("button", {
        name: /delete testimonial from asha rao/i,
      }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Delete testimonial" });
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText("Asha Rao")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Vikram Shah")).toBeInTheDocument();
  });

  it("shows an error alert when a row action fails", async () => {
    server.use(
      http.patch("*/api/admin/testimonials/:id/status", () =>
        HttpResponse.json({ detail: "Conflict." }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Asha Rao");

    await user.click(
      within(rowFor("Asha Rao")).getByRole("button", {
        name: /approve testimonial from asha rao/i,
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Conflict.");
  });
});
