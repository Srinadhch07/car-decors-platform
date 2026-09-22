import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { TestWrapper } from "../../../test-utils";
import type { AdminUser } from "../../../types/api";
import { AdminAuthProvider } from "../../../features/admin/auth";
import LoginPage from "./LoginPage";

const adminUser: AdminUser = { id: "admin-1", email: "admin@slg.com" };

let loginBody: { email: string; password: string } | null = null;

const server = setupServer(
  http.post("*/api/admin/auth/login", async ({ request }) => {
    loginBody = (await request.json()) as { email: string; password: string };
    return HttpResponse.json(adminUser);
  }),
  http.get("*/api/admin/auth/me", () => new HttpResponse(null, { status: 401 })),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  loginBody = null;
});
afterAll(() => server.close());

function renderLogin() {
  return render(
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<div>Admin Home</div>} />
    </Routes>,
    {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/admin/login"]}>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </TestWrapper>
      ),
    },
  );
}

describe("LoginPage", () => {
  it("renders the login form", async () => {
    renderLogin();
    expect(await screen.findByRole("heading", { level: 1, name: /admin sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("marks email and password as required", async () => {
    renderLogin();
    await screen.findByRole("heading", { level: 1, name: /admin sign in/i });
    expect(screen.getByLabelText("Email")).toHaveAttribute("required");
    expect(screen.getByLabelText("Password")).toHaveAttribute("required");
  });

  it("logs in successfully and navigates to the dashboard", async () => {
    const user = userEvent.setup();
    renderLogin();
    await screen.findByRole("heading", { level: 1, name: /admin sign in/i });

    await user.type(screen.getByLabelText("Email"), "admin@slg.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Admin Home")).toBeInTheDocument();
    expect(loginBody).toEqual({ email: "admin@slg.com", password: "secret" });
  });

  it("shows invalid credentials message on 401", async () => {
    server.use(
      http.post("*/api/admin/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await screen.findByRole("heading", { level: 1, name: /admin sign in/i });

    await user.type(screen.getByLabelText("Email"), "admin@slg.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password.");
  });

  it("shows a retry hint on 429 rate limit", async () => {
    server.use(
      http.post("*/api/admin/auth/login", () =>
        HttpResponse.json({ detail: "Too many requests" }, { status: 429 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await screen.findByRole("heading", { level: 1, name: /admin sign in/i });

    await user.type(screen.getByLabelText("Email"), "admin@slg.com");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/too many login attempts/i);
  });

  it("stays on the form after a failed login", async () => {
    server.use(
      http.post("*/api/admin/auth/login", () =>
        HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await screen.findByRole("heading", { level: 1, name: /admin sign in/i });

    await user.type(screen.getByLabelText("Email"), "admin@slg.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await screen.findByRole("alert");
    expect(screen.queryByText("Admin Home")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });
});