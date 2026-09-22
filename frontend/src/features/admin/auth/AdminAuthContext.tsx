import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../../../lib/api/client";
import type { AdminUser } from "../../../types/api";

export interface AdminAuthState {
  session: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
  /** Alias for `session` — kept for the cross-agent contract (`useAdminSession`). */
  admin: AdminUser | null;
  /** Alias for `isAuthenticated` — kept for the cross-agent contract. */
  isAuthed: boolean;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [session, setSession] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore an existing session cookie on first load.
  useEffect(() => {
    let cancelled = false;
    api
      .adminMe()
      .then((me) => {
        if (!cancelled) setSession(me);
      })
      .catch(() => {
        // No valid session cookie → stay logged out.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await api.adminLogin(email, password);
    setSession(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.adminLogout();
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<AdminAuthState>(
    () => ({
      session,
      isAuthenticated: session !== null,
      loading,
      login,
      logout,
      admin: session,
      isAuthed: session !== null,
    }),
    [session, loading, login, logout],
  );

  return <AdminAuthContext value={value}>{children}</AdminAuthContext>;
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an <AdminAuthProvider>");
  }
  return ctx;
}