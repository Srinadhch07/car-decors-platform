import { useEffect, useState, type FormEvent } from "react";
import type { Category, CategoryCreatePayload } from "../../../types/api";
import { slugify } from "./helpers";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const inputClass =
  "w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm " +
  "text-text-primary placeholder-text-muted outline-none focus:border-orange-500 " +
  "focus:ring-1 focus:ring-orange-500";

interface CategoryFormProps {
  /** When provided the form edits this category; otherwise it creates a new one. */
  category?: Category | null;
  submitting?: boolean;
  /** Server-side error for the current action (e.g. 409 slug conflict). */
  error?: string | null;
  onSubmit: (payload: CategoryCreatePayload) => void;
  onCancel?: () => void;
}

/**
 * Inline category create/edit form bound to `CategoryCreatePayload`
 * (`CategoryUpdatePayload` is the same shape with all-optional fields).
 */
export function CategoryForm({
  category = null,
  submitting = false,
  error = null,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(category?.description ?? "");
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(category ? String(category.sort_order) : "0");
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setName(category?.name ?? "");
    setSlug(category?.slug ?? "");
    setSlugTouched(Boolean(category));
    setDescription(category?.description ?? "");
    setImageUrl(category?.image_url ?? "");
    setSortOrder(category ? String(category.sort_order) : "0");
    setIsActive(category?.is_active ?? true);
    setValidationError(null);
  }, [category]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName) {
      setValidationError("Name is required.");
      return;
    }
    if (!trimmedSlug) {
      setValidationError("Slug is required.");
      return;
    }
    if (!SLUG_PATTERN.test(trimmedSlug)) {
      setValidationError(
        "Slug must contain only lowercase letters, numbers, and hyphens.",
      );
      return;
    }

    const parsedSort = Number.parseInt(sortOrder, 10);
    setValidationError(null);
    onSubmit({
      name: trimmedName,
      slug: trimmedSlug,
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      sort_order: Number.isNaN(parsedSort) ? 0 : parsedSort,
      is_active: isActive,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-lg border border-border-light bg-white p-5 shadow-card"
      aria-label={isEdit ? "Edit category" : "New category"}
    >
      <h3 className="mb-4 text-lg font-semibold text-text-primary">
        {isEdit ? "Edit category" : "Add a new category"}
      </h3>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category-name" className="mb-2 block text-sm font-semibold text-text-primary">
            Name
          </label>
          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Seat Covers"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="category-slug" className="mb-2 block text-sm font-semibold text-text-primary">
            Slug
          </label>
          <input
            id="category-slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="e.g. seat-covers"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="category-description" className="mb-2 block text-sm font-semibold text-text-primary">
          Description
        </label>
        <textarea
          id="category-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional category description"
          className={inputClass}
        />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category-image-url" className="mb-2 block text-sm font-semibold text-text-primary">
            Image URL
          </label>
          <input
            id="category-image-url"
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/images/categories/seat-covers.jpg"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="category-sort-order" className="mb-2 block text-sm font-semibold text-text-primary">
            Sort order
          </label>
          <input
            id="category-sort-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
          <input
            id="category-is-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-orange-600 focus:ring-orange-500"
          />
          Active
        </label>
      </div>

      {(validationError || error) && (
        <p role="alert" className="mb-4 text-sm font-medium text-error">
          {validationError ?? error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-orange-700 active:bg-orange-800 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-muted active:bg-surface-dim"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}