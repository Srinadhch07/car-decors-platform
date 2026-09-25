import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../../../lib/api/client";
import { blockIndexing } from "../../../lib/seo";
import type { AdminUser } from "../../../types/api";

export interface AdminAuthState {
  session: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
  /**
   * Best-effort logout used after the server revoked the session (email or
   * password change): clears cookies and the in-memory session so the UI can
   * bounce the admin to the login screen.
   */
  invalidateSession: () => Promise<void>;
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

  // Admin screens must never appear in search results or social shares.
  useEffect(() => {
    blockIndexing();
  }, []);

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

  const invalidateSession = useCallback(async () => {
    try {
      await api.adminLogout();
    } catch {
      // The server already revoked this session; the call may 401/403.
    }
    setSession(null);
  }, []);

  const value = useMemo<AdminAuthState>(
    () => ({
      session,
      isAuthenticated: session !== null,
      loading,
      login,
      logout,
      invalidateSession,
      admin: session,
      isAuthed: session !== null,
    }),
    [session, loading, login, logout, invalidateSession],
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