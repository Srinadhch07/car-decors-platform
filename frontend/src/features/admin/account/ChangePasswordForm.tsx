import { useState } from "react";
import type { FormEvent } from "react";
import { ApiRequestError, api } from "../../../lib/api/client";
import { PASSWORD_MIN_LENGTH } from "../auth/passwordPolicy";

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

interface ChangePasswordFormProps {
  onSuccess: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clientValidation(): string | null {
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (newPassword !== confirmPassword) {
      return "New password and confirmation do not match.";
    }
    if (currentPassword === newPassword) {
      return "New password must be different from the current password.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = clientValidation();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.adminChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Unable to change password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Change password form" className="space-y-4">
      <div>
        <label htmlFor="account-current-password" className="mb-1 block text-sm font-medium text-text-primary">
          Current password
        </label>
        <input
          id="account-current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="account-new-password" className="mb-1 block text-sm font-medium text-text-primary">
          New password
        </label>
        <input
          id="account-new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="account-confirm-password" className="mb-1 block text-sm font-medium text-text-primary">
          Confirm new password
        </label>
        <input
          id="account-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-sm text-text-secondary">
          Use at least {PASSWORD_MIN_LENGTH} characters.
        </p>
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
        {submitting ? "Changing password…" : "Change password"}
      </button>
      <p className="text-sm text-text-secondary">
        You will be signed out and must sign in again with the new password.
      </p>
    </form>
  );
}