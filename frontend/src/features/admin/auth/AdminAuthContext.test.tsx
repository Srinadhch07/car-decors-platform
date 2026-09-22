import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { AdminUser } from "../../../types/api";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthContext";
import { useAdminSession } from "./useAdminSession";

const adminUser: AdminUser = { id: "admin-1", email: "admin@slg.com" };

let loginBody: { email: string; password: string } | null = null;
let logoutCalled = false;

const server = setupServer(
  http.post("*/api/admin/auth/login", async ({ request }) => {
    loginBody = (await request.json()) as { email: string; password: string };
    return HttpResponse.json(adminUser);
  }),
  http.get("*/api/admin/auth/me", () => new HttpResponse(null, { status: 401 })),
  http.post("*/api/admin/auth/logout", () => {
    logoutCalled = true;
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  loginBody = null;
  logoutCalled = false;
});
afterAll(() => server.close());

function Probe() {
  const { session, isAuthenticated, isAuthed, admin, loading, login, logout } = useAdminSession();
  return (
    <div>
      <p data-testid="email">{session?.email ?? "none"}</p>
      <p data-testid="admin">{admin?.email ?? "none"}</p>
      <p data-testid="is-authenticated">{String(isAuthenticated)}</p>
      <p data-testid="is-authed">{String(isAuthed)}</p>
      <p data-testid="loading">{String(loading)}</p>
      <button
        type="button"
        onClick={() => void login("admin@slg.com", "secret").catch(() => {})}
      >
        Login
      </button>
      <button type="button" onClick={() => void logout().catch(() => {})}>
        Log out
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <TestWrapper>
      <AdminAuthProvider>
        <Probe />
      </AdminAuthProvider>
    </TestWrapper>,
  );
}

describe("AdminAuthContext", () => {
  it("starts logged out when no valid session cookie", async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  it("restores the session from /me when a cookie exists", async () => {
    server.use(http.get("*/api/admin/auth/me", () => HttpResponse.json(adminUser)));
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent(adminUser.email);
    });
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("is-authed")).toHaveTextContent("true");
    expect(screen.getByTestId("admin")).toHaveTextContent(adminUser.email);
  });

  it("persists the admin after login", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent(adminUser.email);
    });
    expect(loginBody).toEqual({ email: "admin@slg.com", password: "secret" });
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
  });

  it("keeps the session empty when login fails", async () => {
    server.use(
      http.post("*/api/admin/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("email")).toHaveTextContent("none");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  it("clears the session and calls the logout endpoint", async () => {
    server.use(http.get("*/api/admin/auth/me", () => HttpResponse.json(adminUser)));
    const user = userEvent.setup();
    renderProbe();

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent(adminUser.email);
    });

    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent("none");
    });
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    expect(logoutCalled).toBe(true);
  });

  it("throws when used outside the provider", () => {
    function Unwrapped() {
      useAdminAuth();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Unwrapped />)).toThrow(/AdminAuthProvider/i);
    spy.mockRestore();
  });
});