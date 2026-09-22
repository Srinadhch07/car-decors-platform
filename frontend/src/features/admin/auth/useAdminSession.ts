import { useAdminAuth } from "./AdminAuthContext";

/**
 * Contract seam (docs/ADMIN_ARCHITECTURE_CONTRACT.md §6): the admin session hook
 * that AdminShell and sibling admin features consume. Alias of `useAdminAuth`.
 * Returns `{ isAuthed, admin, loading, login, logout }` plus `session` /
 * `isAuthenticated` aliases.
 */
export function useAdminSession() {
  return useAdminAuth();
}