import { useCallback, useEffect, useState } from "react";
import { api } from "../../../lib/api/client";
import type {
  Subcategory,
  SubcategoryCreatePayload,
  SubcategoryUpdatePayload,
} from "../../../types/api";
import { sortCatalogRows, toAdminError, type AdminActionError } from "./helpers";

/**
 * Normalize whatever shape the client's list method returns into `Subcategory[]`.
 * The real backend returns a bare array; keep accepting a paged `{ items }`
 * envelope defensively so a future client/type change stays compatible.
 */
function toSubcategoryList(value: unknown): Subcategory[] {
  if (Array.isArray(value)) return value as Subcategory[];
  if (
    value !== null &&
    typeof value === "object" &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: Subcategory[] }).items;
  }
  return [];
}

export interface UseAdminSubcategoriesResult {
  subcategories: Subcategory[];
  loading: boolean;
  /** Errors from the initial list load (surfaced via ErrorState). */
  error: string | null;
  /** Errors from create/update/delete actions, incl. 409 conflicts. */
  actionError: AdminActionError | null;
  refresh: () => Promise<void>;
  create: (payload: SubcategoryCreatePayload) => Promise<Subcategory>;
  update: (id: string, payload: SubcategoryUpdatePayload) => Promise<Subcategory>;
  remove: (id: string) => Promise<void>;
}

/**
 * Load and manage admin subcategories through the shared `api` singleton.
 * `create`/`update`/`remove` throw on failure after recording `actionError`,
 * so callers can keep forms/confirm panels open on error.
 */
export function useAdminSubcategories(): UseAdminSubcategoriesResult {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<AdminActionError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: unknown = await api.adminListSubcategories();
      setSubcategories(sortCatalogRows(toSubcategoryList(data)));
      setLoading(false);
    } catch (err) {
      setError(toAdminError(err).message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(async (payload: SubcategoryCreatePayload) => {
    setActionError(null);
    try {
      const created = await api.adminCreateSubcategory(payload);
      setSubcategories((prev) => sortCatalogRows([...prev, created]));
      return created;
    } catch (err) {
      setActionError(toAdminError(err));
      throw err;
    }
  }, []);

  const update = useCallback(
    async (id: string, payload: SubcategoryUpdatePayload) => {
      setActionError(null);
      try {
        const updated = await api.adminUpdateSubcategory(id, payload);
        setSubcategories((prev) =>
          sortCatalogRows(prev.map((sub) => (sub.id === id ? updated : sub))),
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
      await api.adminDeleteSubcategory(id);
      setSubcategories((prev) => prev.filter((sub) => sub.id !== id));
    } catch (err) {
      setActionError(toAdminError(err));
      throw err;
    }
  }, []);

  return {
    subcategories,
    loading,
    error,
    actionError,
    refresh,
    create,
    update,
    remove,
  };
}