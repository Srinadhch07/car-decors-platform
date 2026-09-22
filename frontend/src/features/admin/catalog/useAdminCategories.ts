import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api/client";
import type {
  Category,
  CategoryCreatePayload,
  CategoryUpdatePayload,
} from "../../../types/api";
import { sortCatalogRows, toAdminError, type AdminActionError } from "./helpers";

/**
 * Normalize whatever shape the client's list method returns into `Category[]`.
 * The real backend returns a bare array; keep accepting a paged `{ items }`
 * envelope defensively so a future client/type change stays compatible.
 */
function toCategoryList(value: unknown): Category[] {
  if (Array.isArray(value)) return value as Category[];
  if (
    value !== null &&
    typeof value === "object" &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: Category[] }).items;
  }
  return [];
}

export interface UseAdminCategoriesResult {
  categories: Category[];
  loading: boolean;
  /** Errors from the initial list load (surfaced via ErrorState). */
  error: string | null;
  /** Errors from create/update/delete actions, incl. 409 conflicts. */
  actionError: AdminActionError | null;
  refresh: () => Promise<void>;
  create: (payload: CategoryCreatePayload) => Promise<Category>;
  update: (id: string, payload: CategoryUpdatePayload) => Promise<Category>;
  remove: (id: string) => Promise<void>;
}

/**
 * Load and manage admin categories through the shared `api` singleton.
 * `create`/`update`/`remove` throw on failure after recording `actionError`,
 * so callers can keep forms/confirm panels open on error.
 */
export function useAdminCategories(): UseAdminCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<AdminActionError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: unknown = await api.adminListCategories();
      setCategories(sortCatalogRows(toCategoryList(data)));
      setLoading(false);
    } catch (err) {
      setError(toAdminError(err).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: CategoryCreatePayload) => {
    setActionError(null);
    try {
      const created = await api.adminCreateCategory(payload);
      setCategories((prev) => sortCatalogRows([...prev, created]));
      return created;
    } catch (err) {
      setActionError(toAdminError(err));
      throw err;
    }
  }, []);

  const update = useCallback(
    async (id: string, payload: CategoryUpdatePayload) => {
      setActionError(null);
      try {
        const updated = await api.adminUpdateCategory(id, payload);
        setCategories((prev) =>
          sortCatalogRows(prev.map((cat) => (cat.id === id ? updated : cat))),
        );
        return updated;
      } catch (err) {
        setActionError(toAdminError(err));
        throw err;
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setActionError(null);
    try {
      await api.adminDeleteCategory(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      setActionError(toAdminError(err));
      throw err;
    }
  }, []);

  return { categories, loading, error, actionError, refresh, create, update, remove };
}