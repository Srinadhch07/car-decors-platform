import { useEffect, useState, type FormEvent } from "react";
import type {
  Category,
  Subcategory,
  SubcategoryCreatePayload,
} from "../../../types/api";
import { slugify } from "./helpers";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const inputClass =
  "w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm " +
  "text-text-primary placeholder-text-muted outline-none focus:border-orange-500 " +
  "focus:ring-1 focus:ring-orange-500";

interface SubcategoryFormProps {
  /** When provided the form edits this subcategory; otherwise it creates one. */
  subcategory?: Subcategory | null;
  categoryId?: string;
  categories: Category[];
  submitting?: boolean;
  /** Server-side error for the current action (e.g. 409 slug conflict). */
  error?: string | null;
  onSubmit: (payload: SubcategoryCreatePayload) => void;
  onCancel?: () => void;
}

/**
 * Inline subcategory create/edit form bound to `SubcategoryCreatePayload`
 * (`SubcategoryUpdatePayload` is the same shape with all-optional fields).
 */
export function SubcategoryForm({
  subcategory = null,
  categoryId = "",
  categories,
  submitting = false,
  error = null,
  onSubmit,
  onCancel,
}: SubcategoryFormProps) {
  const isEdit = Boolean(subcategory);

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    subcategory?.category_id ?? categoryId,
  );
  const [name, setName] = useState(subcategory?.name ?? "");
  const [slug, setSlug] = useState(subcategory?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [imageUrl, setImageUrl] = useState(subcategory?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(
    subcategory ? String(subcategory.sort_order) : "0",
  );
  const [isActive, setIsActive] = useState(subcategory?.is_active ?? true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategoryId(subcategory?.category_id ?? categoryId);
    setName(subcategory?.name ?? "");
    setSlug(subcategory?.slug ?? "");
    setSlugTouched(Boolean(subcategory));
    setImageUrl(subcategory?.image_url ?? "");
    setSortOrder(subcategory ? String(subcategory.sort_order) : "0");
    setIsActive(subcategory?.is_active ?? true);
    setValidationError(null);
  }, [subcategory, categoryId]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!selectedCategoryId) {
      setValidationError("Please select a category.");
      return;
    }
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
      category_id: selectedCategoryId,
      name: trimmedName,
      slug: trimmedSlug,
      image_url: imageUrl.trim() || null,
      sort_order: Number.isNaN(parsedSort) ? 0 : parsedSort,
      is_active: isActive,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-lg border border-border-light bg-white p-5 shadow-card"
      aria-label={isEdit ? "Edit subcategory" : "New subcategory"}
    >
      <h3 className="mb-4 text-lg font-semibold text-text-primary">
        {isEdit ? "Edit subcategory" : "Add a new subcategory"}
      </h3>

      <div className="mb-4">
        <label htmlFor="subcategory-category-id" className="mb-2 block text-sm font-semibold text-text-primary">
          Category
        </label>
        <select
          id="subcategory-category-id"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          disabled={categories.length === 0}
          className={inputClass}
        >
          <option value="">Select a category…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="subcategory-name" className="mb-2 block text-sm font-semibold text-text-primary">
            Name
          </label>
          <input
            id="subcategory-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Premium"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="subcategory-slug" className="mb-2 block text-sm font-semibold text-text-primary">
            Slug
          </label>
          <input
            id="subcategory-slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="e.g. premium"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="subcategory-image-url" className="mb-2 block text-sm font-semibold text-text-primary">
            Image URL
          </label>
          <input
            id="subcategory-image-url"
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/images/subcategories/premium.jpg"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="subcategory-sort-order" className="mb-2 block text-sm font-semibold text-text-primary">
            Sort order
          </label>
          <input
            id="subcategory-sort-order"
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
            id="subcategory-is-active"
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
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create subcategory"}
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