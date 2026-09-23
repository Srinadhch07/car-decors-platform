import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Route, Routes, useLocation } from "react-router-dom";
import { TestWrapper } from "../../../test-utils";
import type { AdminUser } from "../../../types/api";
import { AdminAuthProvider } from "../../../features/admin/auth";
import { AccountSettings } from "../../../features/admin/account";

const adminUser: AdminUser = { id: "admin-1", email: "admin@slg.com" };

let changeEmailBody: { new_email: string; current_password: string } | null = null;
let changePasswordBody: {
  current_password: string;
  new_password: string;
  confirm_password: string;
} | null = null;
let logoutCalled = false;

const server = setupServer(
  http.get("*/api/admin/auth/me", () => HttpResponse.json(adminUser)),
  http.post("*/api/admin/auth/logout", () => {
    logoutCalled = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("*/api/admin/auth/change-email", async ({ request }) => {
    changeEmailBody = (await request.json()) as { new_email: string; current_password: string };
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("*/api/admin/auth/change-password", async ({ request }) => {
    changePasswordBody = (await request.json()) as {
      current_password: string;
      new_password: string;
      confirm_password: string;
    };
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  changeEmailBody = null;
  changePasswordBody = null;
  logoutCalled = false;
});
afterAll(() => server.close());

function LoginNotice() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;
  return <div>Login Page Placeholder{notice ? ` — ${notice}` : ""}</div>;
}

function renderAccount() {
  return render(
    <Routes>
      <Route path="/admin/account" element={<AccountSettings />} />
      <Route path="/admin/login" element={<LoginNotice />} />
    </Routes>,
    {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/admin/account"]}>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </TestWrapper>
      ),
    },
  );
}

describe("AccountSettings", () => {
  it("shows the admin email from the session", async () => {
    renderAccount();
    expect(
      await screen.findByRole("heading", { level: 1, name: /account settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(adminUser.email)).toBeInTheDocument();
  });

  it("renders both forms", async () => {
    renderAccount();
    await screen.findByRole("heading", { level: 1, name: /account settings/i });
    expect(screen.getByRole("form", { name: "Change email form" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Change password form" })).toBeInTheDocument();
  });

  it("changes email, clears the session and redirects to login with a notice", async () => {
    const user = userEvent.setup();
    renderAccount();
    await screen.findByRole("heading", { level: 1, name: /account settings/i });
    const form = within(screen.getByRole("form", { name: "Change email form" }));

    await user.type(form.getByLabelText("New email"), "boss@slg.com");
    await user.type(form.getByLabelText("Current password"), "correct-horse-battery");
    await user.click(form.getByRole("button", { name: "Change email" }));

    expect(await screen.findByText(/login page placeholder/i)).toBeInTheDocument();
    expect(screen.getByText(/email updated/i)).toBeInTheDocument();
    expect(changeEmailBody).toEqual({
      new_email: "boss@slg.com",
      current_password: "correct-horse-battery",
    });
    expect(logoutCalled).toBe(true);
  });

  it("shows a conflict message when the email is already taken", async () => {
    server.use(
      http.post("*/api/admin/auth/change-email", () =>
        HttpResponse.json({ detail: "new_email: already in use" }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderAccount();
    await screen.findByRole("heading", { level: 1, name: /account settings/i });
    const form = within(screen.getByRole("form", { name: "Change email form" }));

    await user.type(form.getByLabelText("New email"), "taken@slg.com");
    await user.type(form.getByLabelText("Current password"), "correct-horse-battery");
    await user.click(form.getByRole("button", { name: "Change email" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/already in use/i);
    expect(screen.queryByText(/login page placeholder/i)).not.toBeInTheDocument();
  });

  it("changes password, clears the session and redirects to login with a notice", async () => {
    const user = userEvent.setup();
    renderAccount();
    await screen.findByRole("heading", { level: 1, name: /account settings/i });
    const form = within(screen.getByRole("form", { name: "Change password form" }));

    await user.type(form.getByLabelText("Current password"), "correct-horse-battery");
    await user.type(form.getByLabelText("New password"), "strong-new-password");
    await user.type(form.getByLabelText("Confirm new password"), "strong-new-password");
    await user.click(form.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText(/login page placeholder/i)).toBeInTheDocument();
    expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    expect(changePasswordBody).toEqual({
      current_password: "correct-horse-battery",
      new_password: "strong-new-password",
      confirm_password: "strong-new-password",
    });
    expect(logoutCalled).toBe(true);
  });

  it("rejects a too-short client-side new password without calling the API", async () => {
    const user = userEvent.setup();
    renderAccount();
    await screen.findByRole("heading", { level: 1, name: /account settings/i });
    const form = within(screen.getByRole("form", { name: "Change password form" }));

    await user.type(form.getByLabelText("Current password"), "correct-horse-battery");
    await user.type(form.getByLabelText("New password"), "short");
    await user.type(form.getByLabelText("Confirm new password"), "short");
    await user.click(form.getByRole("button", { name: "Change password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/at least 10 characters/i);
    expect(changePasswordBody).toBeNull();
    expect(logoutCalled).toBe(false);
  });
});