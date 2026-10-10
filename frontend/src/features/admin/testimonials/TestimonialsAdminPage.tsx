import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Eye, EyeOff, Pencil, Star, Trash2, X } from "lucide-react";
import { api } from "../../../lib/api/client";
import { truncate } from "../../../lib/utils/format";
import type {
  AdminTestimonial,
  AdminTestimonialListPage,
  TestimonialAdminQueryParams,
  TestimonialStatus,
} from "../../../types/api";
import {
  Badge,
  Button,
  Container,
  EmptyState,
  ErrorState,
  SectionHeading,
} from "../../../components/ui";
import { Pagination } from "../../products/Pagination";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: TestimonialStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_META: Record<
  TestimonialStatus,
  { label: string; variant: "warning" | "success" | "error" }
> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
};

const selectCls =
  "rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

const fieldCls =
  "w-full rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

interface EditFormState {
  customer_name: string;
  text: string;
  rating: string;
  moderation_note: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function TestimonialsAdminPage() {
  const [params, setParams] = useSearchParams();

  const status = (params.get("status") ?? "") as TestimonialStatus | "";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [data, setData] = useState<AdminTestimonialListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<AdminTestimonial | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    customer_name: "",
    text: "",
    rating: "",
    moderation_note: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminTestimonial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const query: TestimonialAdminQueryParams = { page, page_size: PAGE_SIZE };
    if (status) query.status = status;

    api
      .adminListTestimonials(query)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load testimonials");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, refreshKey]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        next.delete("page");
        return next;
      });
    },
    [setParams],
  );

  const handlePageChange = useCallback(
    (next: number) => {
      setParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set("page", String(next));
        return updated;
      });
    },
    [setParams],
  );

  const applyRowUpdate = useCallback((updated: AdminTestimonial) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
          }
        : prev,
    );
  }, []);

  const runRowAction = useCallback(
    async (id: string, action: () => Promise<AdminTestimonial>, fallback: string) => {
      setUpdatingId(id);
      setActionError(null);
      try {
        applyRowUpdate(await action());
      } catch (err) {
        setActionError(err instanceof Error ? err.message : fallback);
      } finally {
        setUpdatingId(null);
      }
    },
    [applyRowUpdate],
  );

  const handleStatus = useCallback(
    (testimonial: AdminTestimonial, next: TestimonialStatus) =>
      runRowAction(
        testimonial.id,
        () => api.adminSetTestimonialStatus(testimonial.id, next),
        "Failed to update testimonial status",
      ),
    [runRowAction],
  );

  const handlePublication = useCallback(
    (testimonial: AdminTestimonial) =>
      runRowAction(
        testimonial.id,
        () => api.adminSetTestimonialPublication(testimonial.id, !testimonial.published),
        "Failed to update publication",
      ),
    [runRowAction],
  );

  const handleFeatured = useCallback(
    (testimonial: AdminTestimonial) =>
      runRowAction(
        testimonial.id,
        () => api.adminSetTestimonialFeatured(testimonial.id, !testimonial.is_featured),
        "Failed to update featured state",
      ),
    [runRowAction],
  );

  // --- edit dialog ---

  const openEdit = useCallback((testimonial: AdminTestimonial) => {
    setEditError(null);
    setEditTarget(testimonial);
    setEditForm({
      customer_name: testimonial.customer_name,
      text: testimonial.text,
      rating: testimonial.rating === null ? "" : String(testimonial.rating),
      moderation_note: testimonial.moderation_note ?? "",
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditTarget(null);
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!editTarget || saving) return;
      setSaving(true);
      setEditError(null);
      try {
        const note = editForm.moderation_note.trim();
        const updated = await api.adminUpdateTestimonial(editTarget.id, {
          customer_name: editForm.customer_name.trim(),
          text: editForm.text.trim(),
          rating: editForm.rating ? Number(editForm.rating) : null,
          moderation_note: note ? note : null,
        });
        applyRowUpdate(updated);
        setEditTarget(null);
      } catch (err) {
        setEditError(err instanceof Error ? err.message : "Failed to save testimonial");
      } finally {
        setSaving(false);
      }
    },
    [editTarget, editForm, saving, applyRowUpdate],
  );

  // --- delete dialog ---

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.adminDeleteTestimonial(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete testimonial.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const filtered = Boolean(status);

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Testimonials"
          subtitle="Review submissions and control what appears publicly."
          className="mb-0"
        />
        <div>
          <label htmlFor="admin-testimonial-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="admin-testimonial-status"
            value={status}
            onChange={(event) => updateParam("status", event.target.value)}
            className={selectCls}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {loading && <p className="py-12 text-center text-text-muted">Loading testimonials...</p>}

      {!loading && loadError && (
        <ErrorState message={loadError} onRetry={() => setRefreshKey((key) => key + 1)} />
      )}

      {!loading && !loadError && data && data.items.length === 0 && (
        <EmptyState
          title="No testimonials found"
          description={
            filtered
              ? "No testimonials match this status."
              : "New customer submissions will appear here for review."
          }
        />
      )}

      {!loading && !loadError && data && data.items.length > 0 && (
        <>
          <p className="mb-3 text-sm text-text-secondary">
            {data.total} testimonial{data.total !== 1 ? "s" : ""}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border-light bg-white">
            <table className="min-w-full divide-y divide-border-light text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Testimonial
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Published
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Featured
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Submitted
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {data.items.map((testimonial) => {
                  const meta = STATUS_META[testimonial.status];
                  const canFeature =
                    testimonial.status === "approved" &&
                    testimonial.published &&
                    testimonial.consent;
                  const busy = updatingId === testimonial.id;
                  const name = testimonial.customer_name;
                  return (
                    <tr key={testimonial.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{name}</p>
                        <p className="text-xs text-text-muted">
                          {testimonial.consent ? "Consent given" : "No consent"}
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-text-secondary">
                        <p>{truncate(testimonial.text, 100)}</p>
                        {testimonial.rating !== null && (
                          <p className="mt-1 text-xs text-text-muted">
                            {testimonial.rating}/5
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handlePublication(testimonial)}
                          disabled={busy}
                          aria-label={`${testimonial.published ? "Unpublish" : "Publish"} testimonial from ${name}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border-light px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-60"
                        >
                          {testimonial.published ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          {testimonial.published ? "Published" : "Unpublished"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleFeatured(testimonial)}
                          disabled={busy || (!testimonial.is_featured && !canFeature)}
                          title={
                            !testimonial.is_featured && !canFeature
                              ? "Approve, publish, and ensure consent before featuring"
                              : undefined
                          }
                          aria-label={`${testimonial.is_featured ? "Unfeature" : "Feature"} testimonial from ${name}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border-light px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Star
                            className={
                              testimonial.is_featured
                                ? "h-3.5 w-3.5 fill-orange-400 text-orange-400"
                                : "h-3.5 w-3.5"
                            }
                          />
                          {testimonial.is_featured ? "Featured" : "Feature"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(testimonial.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {testimonial.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleStatus(testimonial, "approved")}
                              disabled={busy}
                              aria-label={`Approve testimonial from ${name}`}
                              title="Approve"
                              className="rounded-md p-2 text-text-secondary hover:bg-green-50 hover:text-green-700 disabled:opacity-60"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {testimonial.status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleStatus(testimonial, "rejected")}
                              disabled={busy}
                              aria-label={`Reject testimonial from ${name}`}
                              title="Reject"
                              className="rounded-md p-2 text-text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(testimonial)}
                            aria-label={`Edit testimonial from ${name}`}
                            title="Edit"
                            className="rounded-md p-2 text-text-secondary hover:bg-surface-muted hover:text-orange-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(testimonial);
                            }}
                            aria-label={`Delete testimonial from ${name}`}
                            title="Delete"
                            className="rounded-md p-2 text-text-secondary hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.total_pages > 1 && (
            <div className="mt-6">
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/60 p-4"
          onMouseDown={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-testimonial-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-lg bg-surface p-6 shadow-elevated"
          >
            <h2 id="edit-testimonial-title" className="text-lg font-semibold text-text-primary">
              Edit testimonial
            </h2>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              {editError && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editError}
                </p>
              )}
              <div>
                <label
                  htmlFor="edit-testimonial-name"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  Customer name
                </label>
                <input
                  id="edit-testimonial-name"
                  type="text"
                  maxLength={120}
                  required
                  value={editForm.customer_name}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, customer_name: event.target.value }))
                  }
                  className={fieldCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-testimonial-text"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  Testimonial
                </label>
                <textarea
                  id="edit-testimonial-text"
                  rows={4}
                  maxLength={1000}
                  required
                  value={editForm.text}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, text: event.target.value }))
                  }
                  className={fieldCls}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-testimonial-rating"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  Rating
                </label>
                <select
                  id="edit-testimonial-rating"
                  value={editForm.rating}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, rating: event.target.value }))
                  }
                  className={fieldCls}
                >
                  <option value="">No rating</option>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="edit-testimonial-note"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  Moderation note (private)
                </label>
                <textarea
                  id="edit-testimonial-note"
                  rows={2}
                  maxLength={500}
                  value={editForm.moderation_note}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, moderation_note: event.target.value }))
                  }
                  className={fieldCls}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeEdit} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/60 p-4"
          onMouseDown={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-testimonial-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-surface p-6 shadow-elevated"
          >
            <h2 id="delete-testimonial-title" className="text-lg font-semibold text-text-primary">
              Delete testimonial
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Are you sure you want to delete the testimonial from "{deleteTarget.customer_name}"?
              This action cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

export default TestimonialsAdminPage;
