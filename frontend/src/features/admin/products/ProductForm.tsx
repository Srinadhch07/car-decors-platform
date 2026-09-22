import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { ApiRequestError, api } from "../../../lib/api/client";
import { availabilityLabel } from "../../../lib/utils/format";
import type {
  Category,
  Product,
  ProductAvailability,
  ProductCreatePayload,
  ProductUpdatePayload,
  Subcategory,
} from "../../../types/api";
import { Button } from "../../../components/ui";

const AVAILABILITY_OPTIONS: ProductAvailability[] = ["IN_STOCK", "OUT_OF_STOCK", "ON_ORDER"];

const inputCls =
  "w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

const labelCls = "mb-1.5 block text-sm font-semibold text-text-primary";

interface ProductFormProps {
  /** Present when editing an existing product; omit for create mode. */
  productId?: string;
  onSaved: (product: Product) => void;
  onCancel: () => void;
}

export function ProductForm({ productId, onSaved, onCancel }: ProductFormProps) {
  const isEdit = Boolean(productId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialProduct, setInitialProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState<ProductAvailability>("IN_STOCK");
  const [isActive, setIsActive] = useState(true);
  const [vehicleTags, setVehicleTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load categories (and product when editing) on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await api.getCategories();
        if (cancelled) return;
        setCategories(cats);
        if (!productId) {
          setLoading(false);
          return;
        }
        const product = await api.adminGetProduct(productId);
        if (cancelled) return;
        setInitialProduct(product);
        setName(product.name);
        setCategoryId(product.category_id);
        setDescription(product.description);
        setPrice(product.price ?? "");
        setAvailability(product.availability);
        setIsActive(product.is_active);
        setVehicleTags(product.vehicle_tags);
        setSubcategoryId(product.subcategory_id ?? "");
        const cat = cats.find((c) => c.id === product.category_id);
        if (cat) {
          setSubcategories(await api.getSubcategories(cat.slug));
        } else {
          setSubcategories([]);
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load product");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategoryId(value);
      setSubcategoryId("");
      setSubcategories([]);
      const cat = categories.find((c) => c.id === value);
      const slug = cat?.slug ?? "";
      if (!slug) return;
      api
        .getSubcategories(slug)
        .then((subs) => setSubcategories(subs))
        .catch(() => setSubcategories([]));
    },
    [categories],
  );

  const handleImageChange = useCallback((file: File | null) => {
    setImage(file);
    if (imagePreview) {
      try {
        URL.revokeObjectURL(imagePreview);
      } catch {
        // ignore; preview URLs may not be revocable in all environments
      }
    }
    if (!file) {
      setImagePreview(null);
      return;
    }
    try {
      setImagePreview(URL.createObjectURL(file));
    } catch {
      setImagePreview(null);
    }
  }, [imagePreview]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (!vehicleTags.includes(tag)) {
      setVehicleTags([...vehicleTags, tag]);
    }
    setTagInput("");
  }, [tagInput, vehicleTags]);

  const removeTag = useCallback(
    (tag: string) => {
      setVehicleTags(vehicleTags.filter((t) => t !== tag));
    },
    [vehicleTags],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedPrice = price.trim();

    if (!trimmedName) {
      setValidationError("Product name is required.");
      return;
    }
    if (!categoryId) {
      setValidationError("Please choose a category.");
      return;
    }
    if (trimmedPrice && Number.isNaN(Number(trimmedPrice))) {
      setValidationError("Price must be a valid number or left blank.");
      return;
    }

    const basePayload = {
      name: trimmedName,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      description: trimmedDescription,
      price: trimmedPrice === "" ? null : trimmedPrice,
      availability,
      is_active: isActive,
      vehicle_tags: vehicleTags,
    };

    setSubmitting(true);
    try {
      if (productId) {
        const clearFields: string[] = [];
        if (trimmedPrice === "" && initialProduct?.price != null && initialProduct.price !== "") {
          clearFields.push("price");
        }
        if (!subcategoryId && initialProduct?.subcategory_id != null) {
          clearFields.push("subcategory_id");
        }
        const payload: ProductUpdatePayload = {
          ...basePayload,
          ...(clearFields.length > 0 ? { clear_fields: clearFields } : {}),
        };
        onSaved(await api.adminUpdateProduct(productId, payload, image));
      } else {
        const payload: ProductCreatePayload = { ...basePayload };
        onSaved(await api.adminCreateProduct(payload, image));
      }
  } catch (err) {
    console.error("PRODUCTFORM SUBMIT ERR", err, err instanceof Error ? err.stack : "");
    if (err instanceof ApiRequestError) {
      setSubmitError(err.message || "Failed to save product.");
    } else {
      setSubmitError(err instanceof Error ? err.message : "Failed to save product.");
    }
  } finally {
    setSubmitting(false);
  }
  };

  if (loading) {
    return <p className="py-12 text-center text-text-muted">Loading product form...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-error/30 bg-red-50 p-4 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  const previewSrc = imagePreview ?? (isEdit ? (initialProduct?.image_url ?? null) : null);

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-lg border border-border-light bg-white p-5 sm:p-6">
      <h2 className="text-xl font-bold text-text-primary">
        {isEdit ? "Edit Product" : "Add Product"}
      </h2>

      {(validationError || submitError) && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {validationError ?? submitError}
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Details column */}
        <div className="space-y-5">
          <div>
            <label htmlFor="product-name" className={labelCls}>
              Product Name <span className="text-orange-600">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium Leather Seat Cover"
              className={inputCls}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="product-category" className={labelCls}>
                Category <span className="text-orange-600">*</span>
              </label>
              <select
                id="product-category"
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-subcategory" className={labelCls}>
                Subcategory
              </label>
              <select
                id="product-subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!categoryId || subcategories.length === 0}
                className={`${inputCls} disabled:bg-surface-muted disabled:opacity-60`}
              >
                <option value="">None</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              {categoryId && subcategories.length === 0 && (
                <p className="mt-1 text-xs text-text-muted">No subcategories for this category.</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="product-description" className={labelCls}>
              Description
            </label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the product..."
              className={`${inputCls} resize-y`}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className={labelCls}>
                Price
              </label>
              <input
                id="product-price"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 2999.50 (blank = contact for price)"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="product-availability" className={labelCls}>
                Availability
              </label>
              <select
                id="product-availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ProductAvailability)}
                className={inputCls}
              >
                {AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {availabilityLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            Active (visible in storefront)
          </label>

          <div>
            <label htmlFor="product-tags" className={labelCls}>
              Compatible Vehicles
            </label>
            <div className="flex gap-2">
              <input
                id="product-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="e.g. Hyundai Creta"
                className={inputCls}
              />
              <Button type="button" variant="outline" onClick={addTag} aria-label="Add vehicle tag">
                Add
              </Button>
            </div>
            {vehicleTags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Added vehicle tags">
                {vehicleTags.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-border-light bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="rounded-full p-0.5 text-text-muted hover:text-error"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Image column */}
        <div>
          <span className={labelCls}>Product Image</span>
          <div className="flex flex-col items-start gap-3">
            <div className="flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-muted">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Product image preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-10 w-10 text-text-muted" aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="product-image"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted"
              >
                <ImagePlus className="h-4 w-4" />
                {isEdit ? "Replace image" : "Choose image"}
              </label>
              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              {imagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleImageChange(null)}
                  aria-label="Remove selected image"
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-text-muted">JPEG, PNG or WebP. Max 5 MB.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-border-light pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}