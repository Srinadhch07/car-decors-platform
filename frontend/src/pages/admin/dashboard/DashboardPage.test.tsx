import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { AdminUser, ShopSettings } from "../../../types/api";
import { AdminAuthProvider } from "../../../features/admin/auth";
import DashboardPage from "./DashboardPage";

const adminUser: AdminUser = { id: "admin-1", email: "admin@slg.com" };

const shopSettings: ShopSettings = {
  shop_name: "SLG Car Decors",
  whatsapp_number: "+919876543210",
  phone: "+919876543210",
  email: "contact@slg.com",
  address: "123 Main Street, Chennai",
  business_hours: "Mon-Sat: 9AM-8PM",
  social_links: {
    instagram: "https://instagram.com/slg",
    facebook: "https://facebook.com/slg",
  },
  logo_url: null,
};

let failShop = false;
let shopCalls = 0;

const server = setupServer(
  http.get("*/api/admin/auth/me", () => HttpResponse.json(adminUser)),
  http.get("*/api/admin/shop", () => {
    shopCalls += 1;
    if (failShop) {
      return HttpResponse.json({ detail: "Failed to load shop settings" }, { status: 500 });
    }
    return HttpResponse.json(shopSettings);
  }),
  http.get("*/api/admin/products", () =>
    HttpResponse.json({
      items: [],
      total: 12,
      page: 1,
      page_size: 1,
    }),
  ),
  http.get("*/api/admin/categories", () =>
    HttpResponse.json([
      { id: "cat-1", name: "Interior Lighting" },
      { id: "cat-2", name: "Exterior Styling" },
    ]),
  ),
  http.get("*/api/admin/subcategories", () =>
    HttpResponse.json([
      { id: "sub-1", name: "LED Strips" },
      { id: "sub-2", name: "Footwells" },
      { id: "sub-3", name: "Bumper Lips" },
    ]),
  ),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  failShop = false;
  shopCalls = 0;
});
afterAll(() => server.close());

function renderDashboard() {
  return render(
    <TestWrapper>
      <AdminAuthProvider>
        <DashboardPage />
      </AdminAuthProvider>
    </TestWrapper>,
  );
}

describe("DashboardPage", () => {
  it("greets the signed-in admin with their email", async () => {
    renderDashboard();
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText(/Welcome back, admin@slg\.com/)).toBeInTheDocument();
  });

  it("renders live quick stats totals from the admin APIs", async () => {
    renderDashboard();
    await screen.findByRole("heading", { level: 1, name: "Dashboard" });
    const stats = await screen.findByLabelText("Quick stats");
    expect(within(stats).getByText("Products")).toBeInTheDocument();
    expect(within(stats).getByText("12")).toBeInTheDocument();
    expect(within(stats).getByText("Categories")).toBeInTheDocument();
    expect(within(stats).getByText("2")).toBeInTheDocument();
    expect(within(stats).getByText("Subcategories")).toBeInTheDocument();
    expect(within(stats).getByText("3")).toBeInTheDocument();
  });

  it("reads live shop settings via the admin endpoint", async () => {
    renderDashboard();
    expect(await screen.findByText(shopSettings.shop_name)).toBeInTheDocument();
    expect(screen.getByText(shopSettings.phone)).toBeInTheDocument();
    expect(screen.getByText(shopSettings.email!)).toBeInTheDocument();
    expect(screen.getByText(shopSettings.address)).toBeInTheDocument();
    expect(screen.getByText(shopSettings.business_hours!)).toBeInTheDocument();
    expect(screen.getByText("2 configured")).toBeInTheDocument();
    expect(shopCalls).toBe(1);
  });

  it("shows a loading state while settings fetch", async () => {
    server.use(
      http.get("*/api/admin/shop", async () => {
        await delay(80);
        return HttpResponse.json(shopSettings);
      }),
    );
    renderDashboard();
    expect(screen.getByText("Loading shop settings…")).toBeInTheDocument();
    expect(await screen.findByText(shopSettings.shop_name)).toBeInTheDocument();
  });

  it("shows an error state with Retry that reloads settings", async () => {
    const user = userEvent.setup();
    failShop = true;
    renderDashboard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/failed to load shop settings/i);

    failShop = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText(shopSettings.shop_name)).toBeInTheDocument();
    expect(shopCalls).toBe(2);
  });

  it("renders quick-action links to the agreed routes", async () => {
    renderDashboard();
    await screen.findByText(shopSettings.shop_name);
    expect(screen.getByRole("link", { name: /^manage products /i })).toHaveAttribute(
      "href",
      "/admin/products",
    );
    expect(screen.getByRole("link", { name: /^categories /i })).toHaveAttribute(
      "href",
      "/admin/categories",
    );
    expect(screen.getByRole("link", { name: /^subcategories /i })).toHaveAttribute(
      "href",
      "/admin/subcategories",
    );
    expect(screen.getByRole("link", { name: /^shop settings /i })).toHaveAttribute(
      "href",
      "/admin/shop",
    );
  });

  it("sets the admin document title", async () => {
    renderDashboard();
    await screen.findByText(shopSettings.shop_name);
    expect(document.title).toContain("Admin Dashboard");
  });
});