import { ApiRequestError } from "../../../lib/api/client";

/** A normalized error surfaced for create/update/delete actions. */
export interface AdminActionError {
  message: string;
  status: number | null;
}

/**
 * Normalize any thrown value from the ApiClient into a displayable error.
 * `status` is populated for HTTP-level failures (e.g. 409 conflicts).
 */
export function toAdminError(err: unknown): AdminActionError {
  if (err instanceof ApiRequestError) {
    return { message: err.message, status: err.status };
  }
  return {
    message: err instanceof Error ? err.message : "An unexpected error occurred",
    status: null,
  };
}

/**
 * Convert a display name into a URL-safe slug matching the backend
 * SLUG_PATTERN (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^-*$/, "");
}

/** Sort admin catalog rows by sort_order ascending, then name. */
export function compareCatalogRows<
  T extends { sort_order: number; name: string },
>(a: T, b: T): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

/** Return a sorted copy of admin catalog rows. */
export function sortCatalogRows<T extends { sort_order: number; name: string }>(
  rows: T[],
): T[] {
  return [...rows].sort(compareCatalogRows);
}