import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Film, Image as ImageIcon, Pencil, Star, Trash2 } from "lucide-react";
import { api } from "../../../lib/api/client";
import { formatBytes } from "../../../lib/gallery/media";
import { truncate } from "../../../lib/utils/format";
import type {
  AdminGalleryItem,
  AdminGalleryListPage,
  GalleryAdminQueryParams,
  GalleryBatchFailure,
  GalleryMediaType,
  GallerySort,
} from "../../../types/api";
import {
  Badge,
  Button,
  Container,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeading,
} from "../../../components/ui";
import { Pagination } from "../../products/Pagination";
import { GalleryUploadPanel } from "./GalleryUploadPanel";
import { GalleryEditDialog } from "./GalleryEditDialog";

const PAGE_SIZE = 10;

const MEDIA_OPTIONS: { value: GalleryMediaType | ""; label: string }[] = [
  { value: "", label: "All media" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

const PUBLISHED_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "true", label: "Published" },
  { value: "false", label: "Drafts" },
];

const FEATURED_OPTIONS = [
  { value: "", label: "All items" },
  { value: "true", label: "Featured" },
  { value: "false", label: "Not featured" },
];

const SORT_OPTIONS: { value: GallerySort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "order", label: "Display order" },
];

const selectCls =
  "rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function GalleryAdminPage() {
  const [params, setParams] = useSearchParams();

  const search = params.get("q") ?? "";
  const mediaType = params.get("media_type") ?? "";
  const published = params.get("is_published") ?? "";
  const featured = params.get("is_featured") ?? "";
  const category = params.get("category") ?? "";
  const rawSort = params.get("sort") ?? "newest";
  const sort: GallerySort = rawSort === "oldest" || rawSort === "order" ? rawSort : "newest";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [searchDraft, setSearchDraft] = useState(search);
  const [data, setData] = useState<AdminGalleryListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<AdminGalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminGalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setSearchDraft(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const query: GalleryAdminQueryParams = { page, page_size: PAGE_SIZE, sort };
    if (search) query.search = search;
    if (mediaType === "image" || mediaType === "video") query.media_type = mediaType;
    if (category) query.category = category;
    if (published === "true" || published === "false") {
      query.is_published = published === "true";
    }
    if (featured === "true" || featured === "false") {
      query.is_featured = featured === "true";
    }

    api
      .adminListGallery(query)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load gallery");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search, mediaType, category, published, featured, sort, page, refreshKey]);

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

  const handleSearchSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        const term = searchDraft.trim();
        if (term) {
          next.set("q", term);
        } else {
          next.delete("q");
        }
        next.delete("page");
        return next;
      });
    },
    [searchDraft, setParams],
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

  const applyRowUpdate = useCallback((updated: AdminGalleryItem) => {
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
    async (id: string, action: () => Promise<AdminGalleryItem>, fallback: string) => {
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

  const handlePublication = useCallback(
    (item: AdminGalleryItem) =>
      runRowAction(
        item.id,
        () => api.adminSetGalleryPublication(item.id, !item.is_published),
        "Failed to update publication",
      ),
    [runRowAction],
  );

  const handleFeatured = useCallback(
    (item: AdminGalleryItem) =>
      runRowAction(
        item.id,
        () => api.adminSetGalleryFeatured(item.id, !item.is_featured),
        "Failed to update featured state",
      ),
    [runRowAction],
  );

  const handleUploaded = useCallback(
    (items: AdminGalleryItem[], failures: GalleryBatchFailure[]) => {
      setActionError(null);
      const accepted = items.length;
      if (failures.length > 0) {
        const names = failures.map((failure) => failure.filename).join(", ");
        setNotice(
          `Uploaded ${accepted} of ${accepted + failures.length} files. Rejected: ${names}.`,
        );
      } else if (accepted > 0) {
        setNotice(
          `Uploaded ${accepted} ${accepted === 1 ? "item" : "items"}. New uploads start as drafts.`,
        );
      }
      setRefreshKey((key) => key + 1);
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.adminDeleteGallery(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete the item.");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of data?.items ?? []) {
      if (item.category) values.add(item.category);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const hasFilters = Boolean(
    search ||
      mediaType ||
      category ||
      published ||
      featured,
  );

  return (
    <Container className="py-8">
      <SectionHeading
        title="Work Gallery"
        subtitle="Upload photos and videos of your work, then publish and feature your best pieces."
      />

      <GalleryUploadPanel onUploaded={handleUploaded} />

      {notice && (
        <p role="status" className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      )}

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearchSubmit} className="flex min-w-[220px] flex-1 items-end gap-2">
          <div className="flex-1">
            <label htmlFor="gallery-search" className="sr-only">
              Search gallery
            </label>
            <input
              id="gallery-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search title, description or category"
              className={selectCls + " w-full"}
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <div>
          <label htmlFor="gallery-media-filter" className="sr-only">
            Filter by media type
          </label>
          <select
            id="gallery-media-filter"
            value={mediaType}
            onChange={(event) => updateParam("media_type", event.target.value)}
            className={selectCls}
          >
            {MEDIA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gallery-published-filter" className="sr-only">
            Filter by publication
          </label>
          <select
            id="gallery-published-filter"
            value={published}
            onChange={(event) => updateParam("is_published", event.target.value)}
            className={selectCls}
          >
            {PUBLISHED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gallery-featured-filter" className="sr-only">
            Filter by featured
          </label>
          <select
            id="gallery-featured-filter"
            value={featured}
            onChange={(event) => updateParam("is_featured", event.target.value)}
            className={selectCls}
          >
            {FEATURED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gallery-sort" className="sr-only">
            Sort gallery
          </label>
          <select
            id="gallery-sort"
            value={sort}
            onChange={(event) => updateParam("sort", event.target.value)}
            className={selectCls}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {categoryOptions.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-muted">Categories:</span>
          <button
            type="button"
            onClick={() => updateParam("category", "")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              category === ""
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-border-light text-text-secondary hover:bg-surface-muted"
            }`}
          >
            All
          </button>
          {categoryOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateParam("category", value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === value
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-border-light text-text-secondary hover:bg-surface-muted"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {loading && <LoadingState message="Loading gallery..." />}

      {!loading && loadError && (
        <ErrorState message={loadError} onRetry={() => setRefreshKey((key) => key + 1)} />
      )}

      {!loading && !loadError && data && data.items.length === 0 && (
        <EmptyState
          title="No gallery items"
          description={
            hasFilters
              ? "No items match the current filters."
              : "Upload photos or videos to start building your public gallery."
          }
        />
      )}

      {!loading && !loadError && data && data.items.length > 0 && (
        <>
          <p className="mb-3 text-sm text-text-secondary">
            {data.total} {data.total === 1 ? "item" : "items"}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => {
              const busy = updatingId === item.id;
              return (
                <li key={item.id} className="h-full">
                  <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border-light bg-white">
                    <div className="relative aspect-video bg-surface-muted">
                      {item.media_type === "video" ? (
                        <video
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-dark-950/70 px-2 py-0.5 text-xs font-medium text-white">
                        {item.media_type === "video" ? (
                          <Film className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ImageIcon className="h-3 w-3" aria-hidden="true" />
                        )}
                        {item.media_type === "video" ? "Video" : "Image"}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                        <span
                          className="shrink-0 text-xs text-text-muted"
                          title="Display order"
                        >
                          #{item.display_order}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-text-secondary">
                          {truncate(item.description, 100)}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.is_published ? "success" : "warning"}>
                          {item.is_published ? "Published" : "Draft"}
                        </Badge>
                        {item.is_featured && <Badge variant="default">Featured</Badge>}
                        {item.category && <Badge variant="outline">{item.category}</Badge>}
                      </div>

                      <p className="text-xs text-text-muted">
                        {formatBytes(item.size_bytes)} · {formatDate(item.updated_at)}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handlePublication(item)}
                          disabled={busy}
                          aria-label={`${item.is_published ? "Unpublish" : "Publish"} ${item.title}`}
                          title={item.is_published ? "Unpublish" : "Publish"}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border-light px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-60"
                        >
                          {item.is_published ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          {item.is_published ? "Published" : "Draft"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFeatured(item)}
                          disabled={busy || (!item.is_featured && !item.is_published)}
                          title={
                            !item.is_featured && !item.is_published
                              ? "Publish the item before featuring it"
                              : undefined
                          }
                          aria-label={`${item.is_featured ? "Unfeature" : "Feature"} ${item.title}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border-light px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Star
                            className={
                              item.is_featured
                                ? "h-3.5 w-3.5 fill-orange-400 text-orange-400"
                                : "h-3.5 w-3.5"
                            }
                          />
                          {item.is_featured ? "Featured" : "Feature"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditTarget(item)}
                          aria-label={`Edit ${item.title}`}
                          title="Edit"
                          className="ml-auto rounded-md p-2 text-text-secondary hover:bg-surface-muted hover:text-orange-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(item);
                          }}
                          aria-label={`Delete ${item.title}`}
                          title="Delete"
                          className="rounded-md p-2 text-text-secondary hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

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

      {editTarget && (
        <GalleryEditDialog
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={applyRowUpdate}
        />
      )}

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
            aria-labelledby="delete-gallery-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-surface p-6 shadow-elevated"
          >
            <h2 id="delete-gallery-title" className="text-lg font-semibold text-text-primary">
              Delete gallery item
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Are you sure you want to delete "{truncate(deleteTarget.title, 60)}"? The media file
              will also be removed. This action cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
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
              <Button type="button" onClick={() => void confirmDelete()} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

export default GalleryAdminPage;
