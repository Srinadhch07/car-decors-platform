import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Car, KeyRound } from "lucide-react";
import { ApiRequestError, api } from "../../../lib/api/client";

const inputClass =
  "mt-1 w-full rounded-md border border-dark-700 bg-dark-800 px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Forgot Password | Car Decor Admin";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await api.adminForgotPassword(email.trim());
      setSentMessage(response.message);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to request a reset link. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Car className="mx-auto h-10 w-10 text-orange-500" aria-hidden="true" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Forgot Password</h1>
          <p className="mt-1 text-sm text-text-muted">Car Decor platform administration</p>
        </div>

        {sentMessage ? (
          <div
            role="status"
            className="rounded-xl border border-dark-700 bg-dark-900 p-6 text-center shadow-elevated"
          >
            <KeyRound className="mx-auto h-8 w-8 text-orange-500" aria-hidden="true" />
            <p className="mt-4 text-sm text-text-inverse">{sentMessage}</p>
            <Link
              to="/admin/login"
              className="mt-5 inline-block text-sm font-medium text-orange-500 hover:text-orange-400"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-dark-700 bg-dark-900 p-6 shadow-elevated"
            aria-busy={submitting}
          >
            <p className="mb-4 text-sm text-text-muted">
              Enter the admin account email and we will send a one-time reset link.
            </p>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-text-inverse">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
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
              {submitting ? "Sending link…" : "Send reset link"}
            </button>

            <p className="mt-4 text-center text-sm">
              <Link to="/admin/login" className="font-medium text-orange-500 hover:text-orange-400">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;