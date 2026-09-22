import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { ApiRequestError } from "../../../lib/api/client";
import { useAdminAuth } from "../../../features/admin/auth";

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.status === 401) return "Invalid email or password.";
    if (err.status === 429) return "Too many login attempts. Please wait a few moments and try again.";
  }
  return err instanceof Error ? err.message : "Unable to sign in. Please try again.";
}

const inputClass =
  "mt-1 w-full rounded-md border border-dark-700 bg-dark-800 px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40";

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If the session cookie restored an authed session, leave the login screen.
  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3 text-text-muted" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-700 border-t-orange-500" />
          <p className="text-sm">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Car className="mx-auto h-10 w-10 text-orange-500" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Admin Sign In</h1>
          <p className="mt-1 text-sm text-text-muted">Car Decor platform administration</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-elevated"
          aria-busy={submitting}
        >
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-text-inverse">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-text-inverse"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-red-900 bg-red-950/40 px-3 py-2.5 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting && (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;