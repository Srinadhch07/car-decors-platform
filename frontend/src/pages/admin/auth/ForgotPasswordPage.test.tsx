import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { TestWrapper } from "../../../test-utils";
import { AdminAuthProvider } from "../../../features/admin/auth";
import ForgotPasswordPage from "./ForgotPasswordPage";

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

let forgotBody: { email: string } | null = null;

const server = setupServer(
  http.post("*/api/admin/auth/forgot-password", async ({ request }) => {
    forgotBody = (await request.json()) as { email: string };
    return HttpResponse.json({ message: GENERIC_MESSAGE });
  }),
  http.get("*/api/admin/auth/me", () => new HttpResponse(null, { status: 401 })),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  forgotBody = null;
});
afterAll(() => server.close());

function renderForgot() {
  return render(
    <Routes>
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/admin/login" element={<div>Login Page Placeholder</div>} />
    </Routes>,
    {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/admin/forgot-password"]}>
          <AdminAuthProvider>{children}</AdminAuthProvider>
        </TestWrapper>
      ),
    },
  );
}

describe("ForgotPasswordPage", () => {
  it("renders the request form", async () => {
    renderForgot();
    expect(await screen.findByRole("heading", { level: 1, name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("submits the email and shows the generic confirmation", async () => {
    const user = userEvent.setup();
    renderForgot();
    await screen.findByRole("heading", { level: 1, name: /forgot password/i });

    await user.type(screen.getByLabelText("Email"), "admin@slg.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(GENERIC_MESSAGE);
    expect(forgotBody).toEqual({ email: "admin@slg.com" });
  });

  it("shows a rate-limit hint on 429", async () => {
    server.use(
      http.post("*/api/admin/auth/forgot-password", () =>
        HttpResponse.json({ detail: "Too many requests" }, { status: 429 }),
      ),
    );
    const user = userEvent.setup();
    renderForgot();
    await screen.findByRole("heading", { level: 1, name: /forgot password/i });

    await user.type(screen.getByLabelText("Email"), "admin@slg.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/too many requests/i);
  });

  it("links back to the login page", async () => {
    renderForgot();
    expect(await screen.findByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/admin/login",
    );
  });
});