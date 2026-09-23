import { useState } from "react";
import type { FormEvent } from "react";
import { ApiRequestError, api } from "../../../lib/api/client";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

interface ChangeEmailFormProps {
  onSuccess: () => void;
}

export function ChangeEmailForm({ onSuccess }: ChangeEmailFormProps) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.adminChangeEmail({
        new_email: newEmail.trim(),
        current_password: currentPassword,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setError("That email address is already in use.");
      } else if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to change email. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Change email form" className="space-y-4">
      <div>
        <label htmlFor="account-new-email" className="mb-1 block text-sm font-medium text-text-primary">
          New email
        </label>
        <input
          id="account-new-email"
          type="email"
          autoComplete="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="admin@example.com"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="account-email-password" className="mb-1 block text-sm font-medium text-text-primary">
          Current password
        </label>
        <input
          id="account-email-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={fieldClass}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Changing email…" : "Change email"}
      </button>
      <p className="text-sm text-text-secondary">
        You will be signed out and must sign in again with the new email.
      </p>
    </form>
  );
}