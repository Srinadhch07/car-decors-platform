import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { TestWrapper } from "../../../test-utils";
import type { AdminUser } from "../../../types/api";
import { AdminAuthProvider } from "../../../features/admin/auth";
import AdminShell from "./AdminShell";

const adminUser: AdminUser = { id: "admin-1", email: "admin@slg.com" };

let logoutCalled = false;

const server = setupServer(
  http.get("*/api/admin/auth/me", () => HttpResponse.json(adminUser)),
  http.post("*/api/admin/auth/logout", () => {
    logoutCalled = true;
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  logoutCalled = false;
});
afterAll(() => server.close());

function renderShell(initialEntries: string[] = ["/admin"]) {
  return render(
    <Routes>
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<div>Dashboard Content</div>} />
        <Route path="products" element={<div>Products Content</div>} />
      </Route>
      <Route path="/admin/login" element={<div>Login Page Placeholder</div>} />
    </Routes>,
    {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={initialEntries}>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </TestWrapper>
      ),
    },
  );
}

describe("AdminShell", () => {
  it("renders sidebar navigation links and the provider email", async () => {
    renderShell();
    const nav = await screen.findByRole("navigation", { name: "Admin navigation" });
    expect(within(nav).getByRole("link", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^products$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^categories$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^subcategories$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^shop settings$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^account$/i })).toBeInTheDocument();
    expect(await screen.findByText(adminUser.email)).toBeInTheDocument();
  });

  it("renders the outlet content inside the shell", async () => {
    renderShell();
    expect(await screen.findByText("Dashboard Content")).toBeInTheDocument();
  });

  it("renders sibling page content through the outlet", async () => {
    renderShell(["/admin/products"]);
    expect(await screen.findByText("Products Content")).toBeInTheDocument();
  });

  it("renders the creator signature in the admin shell footer", async () => {
    renderShell();
    expect(await screen.findByText("A Thridha Labs creation.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Srinadh Chintakindi" })).toHaveAttribute(
      "href",
      "https://srinadhch07.vercel.app/",
    );
  });

  it("marks the active route with aria-current", async () => {
    renderShell();
    const nav = await screen.findByRole("navigation", { name: "Admin navigation" });
    const dashboardLink = within(nav).getByRole("link", { name: /^dashboard$/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  it("redirects to login when not authenticated", async () => {
    server.use(http.get("*/api/admin/auth/me", () => new HttpResponse(null, { status: 401 })));
    renderShell();
    expect(await screen.findByText("Login Page Placeholder")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("logs out and redirects to login", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText(adminUser.email);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByText("Login Page Placeholder")).toBeInTheDocument();
    expect(logoutCalled).toBe(true);
  });

  it("opens and closes the mobile navigation drawer", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard Content");

    await user.click(screen.getByRole("button", { name: "Toggle admin navigation" }));
    expect(screen.getByRole("dialog", { name: "Admin navigation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close admin navigation" }));
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("drawer side links point at the agreed routes", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard Content");

    await user.click(screen.getByRole("button", { name: "Toggle admin navigation" }));
    const drawerNav = within(screen.getByRole("dialog", { name: "Admin navigation" })).getByRole(
      "navigation",
      { name: "Admin navigation" },
    );
    expect(within(drawerNav).getByRole("link", { name: /^products$/i })).toHaveAttribute(
      "href",
      "/admin/products",
    );
    expect(within(drawerNav).getByRole("link", { name: /^categories$/i })).toHaveAttribute(
      "href",
      "/admin/categories",
    );
    expect(within(drawerNav).getByRole("link", { name: /^subcategories$/i })).toHaveAttribute(
      "href",
      "/admin/subcategories",
    );
    expect(within(drawerNav).getByRole("link", { name: /^shop settings$/i })).toHaveAttribute(
      "href",
      "/admin/shop",
    );
    expect(within(drawerNav).getByRole("link", { name: /^account$/i })).toHaveAttribute(
      "href",
      "/admin/account",
    );
    expect(within(drawerNav).getByRole("link", { name: /^dashboard$/i })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("shows a loading state while the session is being restored", async () => {
    server.use(
      http.get("*/api/admin/auth/me", async () => {
        await delay(80);
        return HttpResponse.json(adminUser);
      }),
    );
    renderShell();
    expect(screen.getByText("Loading admin…")).toBeInTheDocument();
    expect(await screen.findByText("Dashboard Content")).toBeInTheDocument();
  });
});