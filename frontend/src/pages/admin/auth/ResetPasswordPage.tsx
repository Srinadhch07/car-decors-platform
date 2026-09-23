import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Car, KeyRound } from "lucide-react";
import { ApiRequestError, api } from "../../../lib/api/client";
import { PASSWORD_MIN_LENGTH } from "../../../features/admin/auth/passwordPolicy";

const inputClass =
  "mt-1 w-full rounded-md border border-dark-700 bg-dark-800 px-3.5 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Reset Password | Car Decor Admin";
  }, []);

  function clientValidation(): string | null {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (newPassword !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const invalid = clientValidation();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.adminResetPassword({
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to reset the password. Please try again.");
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
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">Reset Password</h1>
          <p className="mt-1 text-sm text-text-muted">Car Decor platform administration</p>
        </div>

        {done ? (
          <div
            role="status"
            className="rounded-xl border border-dark-700 bg-dark-900 p-6 text-center shadow-elevated"
          >
            <KeyRound className="mx-auto h-8 w-8 text-orange-500" aria-hidden="true" />
            <p className="mt-4 text-sm text-text-inverse">
              Password reset. You can now sign in with your new password.
            </p>
            <Link
              to="/admin/login"
              className="mt-5 inline-block rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              Sign in
            </Link>
          </div>
        ) : !token ? (
          <div className="rounded-xl border border-dark-700 bg-dark-900 p-6 text-center shadow-elevated">
            <p className="text-sm text-text-inverse">
              This reset link is missing a token. Use the link from your email.
            </p>
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
              Choose a new password for the admin account.
            </p>
            <div>
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-text-inverse">
                New password
              </label>
              <input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-text-inverse">
                Confirm new password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-sm text-text-muted">
                Use at least {PASSWORD_MIN_LENGTH} characters.
              </p>
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
              {submitting ? "Resetting password…" : "Reset password"}
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

export default ResetPasswordPage;