import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { TestWrapper } from "../../../test-utils";
import { AdminAuthProvider } from "../../../features/admin/auth";
import ResetPasswordPage from "./ResetPasswordPage";

let resetBody: { token: string; new_password: string; confirm_password: string } | null = null;

const server = setupServer(
  http.post("*/api/admin/auth/reset-password", async ({ request }) => {
    resetBody = (await request.json()) as {
      token: string;
      new_password: string;
      confirm_password: string;
    };
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetBody = null;
});
afterAll(() => server.close());

function renderReset(initialEntries: string[] = ["/admin/reset-password?token=abc123"]) {
  return render(
    <Routes>
      <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
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

const NEW_PASSWORD = "super-secret-password";

describe("ResetPasswordPage", () => {
  it("renders the reset form with a token", async () => {
    renderReset();
    expect(await screen.findByRole("heading", { level: 1, name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });

  it("submits the token and new password successfully", async () => {
    const user = userEvent.setup();
    renderReset();
    await screen.findByRole("heading", { level: 1, name: /reset password/i });

    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Confirm new password"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/password reset/i);
    expect(resetBody).toEqual({
      token: "abc123",
      new_password: NEW_PASSWORD,
      confirm_password: NEW_PASSWORD,
    });
  });

  it("rejects a new password below the minimum length", async () => {
    const user = userEvent.setup();
    renderReset();
    await screen.findByRole("heading", { level: 1, name: /reset password/i });

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/at least 10 characters/i);
    expect(resetBody).toBeNull();
  });

  it("rejects a confirmation mismatch", async () => {
    const user = userEvent.setup();
    renderReset();
    await screen.findByRole("heading", { level: 1, name: /reset password/i });

    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Confirm new password"), "a different password");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/do not match/i);
    expect(resetBody).toBeNull();
  });

  it("explains that the link is missing when there is no token", async () => {
    renderReset(["/admin/reset-password"]);
    expect(await screen.findByText(/missing a token/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset password" })).not.toBeInTheDocument();
  });

  it("shows an expiry error when the token is invalid", async () => {
    server.use(
      http.post("*/api/admin/auth/reset-password", () =>
        HttpResponse.json({ detail: "Password reset link is invalid or expired." }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderReset();
    await screen.findByRole("heading", { level: 1, name: /reset password/i });

    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Confirm new password"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/invalid or expired/i);
  });

  it("shows a rate-limit hint on 429", async () => {
    server.use(
      http.post("*/api/admin/auth/reset-password", () =>
        HttpResponse.json({ detail: "Too many requests" }, { status: 429 }),
      ),
    );
    const user = userEvent.setup();
    renderReset();
    await screen.findByRole("heading", { level: 1, name: /reset password/i });

    await user.type(screen.getByLabelText("New password"), NEW_PASSWORD);
    await user.type(screen.getByLabelText("Confirm new password"), NEW_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/too many requests/i);
  });

  it("links back to the login page", async () => {
    renderReset();
    expect(await screen.findByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/admin/login",
    );
  });
});