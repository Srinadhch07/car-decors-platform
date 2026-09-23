import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { useAdminAuth } from "../auth";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";

export function AccountSettings() {
  const { session, invalidateSession } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Account Settings | Car Decor Admin";
  }, []);

  const handleAccountChanged = useCallback(
    async (notice: string) => {
      await invalidateSession();
      navigate("/admin/login", { replace: true, state: { notice } });
    },
    [invalidateSession, navigate],
  );

  return (
    <section className="space-y-6" aria-label="Account settings">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-text-secondary">
          Manage the email and password used to sign in to the admin dashboard.
        </p>
      </header>

      <div className="rounded-lg border border-border-light bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text-primary">
          <Mail className="h-4 w-4 text-orange-600" aria-hidden="true" />
          Login email
        </h2>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-border-light pb-1">
            <dt className="text-text-muted">Email</dt>
            <dd className="font-medium text-text-primary">{session?.email ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-border-light bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text-primary">
          <Mail className="h-4 w-4 text-orange-600" aria-hidden="true" />
          Change email
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          Updates the address used to sign in. You will need your current password.
        </p>
        <ChangeEmailForm
          onSuccess={() => void handleAccountChanged("Email updated. Sign in with your new email.")}
        />
      </div>

      <div className="rounded-lg border border-border-light bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text-primary">
          <KeyRound className="h-4 w-4 text-orange-600" aria-hidden="true" />
          Change password
        </h2>
        <p className="mb-4 text-sm text-text-secondary">
          Sets a new password for the admin account. You will need your current password.
        </p>
        <ChangePasswordForm
          onSuccess={() => void handleAccountChanged("Password updated. Sign in with your new password.")}
        />
      </div>
    </section>
  );
}

export default AccountSettings;