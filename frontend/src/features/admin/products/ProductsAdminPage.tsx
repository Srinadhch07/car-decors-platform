import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { ApiRequestError, api } from "../../../lib/api/client";
import { availabilityLabel, formatPrice } from "../../../lib/utils/format";
import type {
  Category,
  Product,
  ProductAdminListPage,
  ProductAdminQueryParams,
  ProductAvailability,
  Subcategory,
} from "../../../types/api";
import {
  Button,
  Container,
  EmptyState,
  ErrorState,
  SectionHeading,
} from "../../../components/ui";
import { Pagination } from "../../products/Pagination";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const AVAILABILITY_OPTIONS: ProductAvailability[] = ["IN_STOCK", "OUT_OF_STOCK", "ON_ORDER"];

const PAGE_SIZE = 10;

const selectCls =
  "rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

export function ProductsAdminPage() {
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const subcategory = params.get("subcategory") ?? "";
  const availability = (params.get("availability") ?? "") as ProductAvailability | "";
  const activeFilter = params.get("active") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const prevSearchRef = useRef(search);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [pageData, setPageData] = useState<ProductAdminListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Load categories for the filter dropdown on mount.
  useEffect(() => {
    let cancelled = false;
    api
      .getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load subcategories for the effective category. When no filter is active,
  // fall back to the first category so subcategory names can always be resolved.
  useEffect(() => {
    const slug = category || categories[0]?.slug || "";
    if (!slug) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    api
      .getSubcategories(slug)
      .then((data) => {
        if (!cancelled) setSubcategories(data);
      })
      .catch(() => {
        if (!cancelled) setSubcategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [category, categories]);

  // Keep the search input in sync with the URL.
  useEffect(() => {
    if (search !== prevSearchRef.current) {
      setSearchInput(search);
      prevSearchRef.current = search;
    }
  }, [search]);

  // Fetch the product listing.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const query: ProductAdminQueryParams = { sort: sort as ProductAdminQueryParams["sort"], page, page_size: PAGE_SIZE };
    if (search) query.search = search;
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (availability) query.availability = availability;
    if (activeFilter === "active") query.is_active = true;
    if (activeFilter === "inactive") query.is_active = false;

    api
      .adminListProducts(query)
      .then((data) => {
        if (!cancelled) {
          setPageData(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load products");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search, category, subcategory, availability, activeFilter, sort, page, refreshKey]);

  // --- URL helpers ---

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

  const handleCategoryFilterChange = useCallback(
    (value: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set("category", value);
        } else {
          next.delete("category");
        }
        next.delete("subcategory");
        next.delete("page");
        return next;
      });
    },
    [setParams],
  );

  const handleSearchSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = searchInput.trim();
      if (trimmed === search) return;
      prevSearchRef.current = trimmed;
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed) {
          next.set("search", trimmed);
        } else {
          next.delete("search");
        }
        next.delete("page");
        return next;
      });
    },
    [searchInput, search, setParams],
  );

  const handleSearchClear = useCallback(() => {
    setSearchInput("");
    prevSearchRef.current = "";
    if (search) {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("search");
        next.delete("page");
        return next;
      });
    }
  }, [search, setParams]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(newPage));
        return next;
      });
    },
    [setParams],
  );

  const handleClearAll = useCallback(() => {
    prevSearchRef.current = "";
    setSearchInput("");
    setParams(new URLSearchParams());
  }, [setParams]);

  // --- row actions ---

  const applyRowUpdate = useCallback((updated: Product) => {
    setPageData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((p) => (p.id === updated.id ? updated : p)),
          }
        : prev,
    );
  }, []);

  const handleAvailabilityChange = useCallback(
    async (product: Product, value: ProductAvailability) => {
      setUpdatingId(product.id);
      setActionError(null);
      try {
        const updated = await api.adminUpdateProduct(product.id, { availability: value });
        applyRowUpdate(updated);
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to update availability",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [applyRowUpdate],
  );

  const handleToggleActive = useCallback(
    async (product: Product) => {
      setUpdatingId(product.id);
      setActionError(null);
      try {
        const updated = await api.adminUpdateProduct(product.id, {
          is_active: !product.is_active,
        });
        applyRowUpdate(updated);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update status");
      } finally {
        setUpdatingId(null);
      }
    },
    [applyRowUpdate],
  );

  const requestDelete = useCallback((product: Product) => {
    setDeleteError(null);
    setDeleteTarget(product);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.adminDeleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setDeleteError(err.message || "Cannot delete this product.");
      } else {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete product.");
      }
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const subcategoryName = (id: string | null) =>
    id ? subcategories.find((s) => s.id === id)?.name ?? null : null;

  const filtered = Boolean(search || category || subcategory || availability || activeFilter);

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Products"
          subtitle="Manage your product catalog: filter, edit availability and active status."
          className="mb-0"
        />
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Filter / search bar */}
      <div className="mb-5 rounded-lg border border-border-light bg-white p-4">
        <form onSubmit={handleSearchSubmit} className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="w-full rounded-md border border-border-light bg-white py-2 pl-10 pr-10 text-sm text-text-primary placeholder-text-muted outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="admin-filter-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="admin-filter-category"
              value={category}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className={selectCls}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin-filter-subcategory" className="sr-only">
              Filter by subcategory
            </label>
            <select
              id="admin-filter-subcategory"
              value={subcategory}
              onChange={(e) => updateParam("subcategory", e.target.value)}
              className={selectCls}
            >
              <option value="">All Subcategories</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin-filter-availability" className="sr-only">
              Filter by availability
            </label>
            <select
              id="admin-filter-availability"
              value={availability}
              onChange={(e) =>
                updateParam("availability", e.target.value as ProductAvailability)
              }
              className={selectCls}
            >
              <option value="">Any Availability</option>
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {availabilityLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin-filter-active" className="sr-only">
              Filter by status
            </label>
            <select
              id="admin-filter-active"
              value={activeFilter}
              onChange={(e) => updateParam("active", e.target.value)}
              className={selectCls}
            >
              <option value="">Any Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label htmlFor="admin-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="admin-sort"
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className={selectCls}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filtered && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {loading && <p className="py-12 text-center text-text-muted">Loading products...</p>}

      {!loading && loadError && (
        <ErrorState
          message={loadError}
          onRetry={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {!loading && !loadError && pageData && pageData.items.length === 0 && (
        <EmptyState
          title="No products found"
          description={
            filtered
              ? "Try adjusting your filters or search criteria."
              : "No products in your catalog yet. Add your first product to get started."
          }
          action={
            filtered ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            )
          }
        />
      )}

      {!loading && !loadError && pageData && pageData.items.length > 0 && (
        <>
          <p className="mb-3 text-sm text-text-secondary">
            {pageData.total} product{pageData.total !== 1 ? "s" : ""}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border-light bg-white">
            <table className="min-w-full divide-y divide-border-light text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Availability
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-text-secondary">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {pageData.items.map((product) => {
                  const subName = subcategoryName(product.subcategory_id);
                  return (
                    <tr key={product.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border-light bg-surface-muted">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full" aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text-primary">
                              {product.name}
                            </p>
                            <p className="text-xs text-text-muted">#{product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {categoryName(product.category_id)}
                        {subName && <span className="block text-xs text-text-muted">{subName}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={product.availability}
                          onChange={(e) =>
                            handleAvailabilityChange(
                              product,
                              e.target.value as ProductAvailability,
                            )
                          }
                          disabled={updatingId === product.id}
                          aria-label={`Availability for ${product.name}`}
                          className={`rounded-md border border-border-light bg-white px-2 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60`}
                        >
                          {AVAILABILITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {availabilityLabel(option)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={product.is_active}
                          aria-label={`Toggle active state for ${product.name}`}
                          onClick={() => handleToggleActive(product)}
                          disabled={updatingId === product.id}
                          className="inline-flex items-center gap-2 rounded-full border border-border-light bg-white py-1 pr-3 pl-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-60"
                        >
                          <span
                            className={`h-4 w-4 rounded-full ${
                              product.is_active ? "bg-green-500" : "bg-border"
                            }`}
                            aria-hidden="true"
                          />
                          {product.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-md p-2 text-text-secondary hover:bg-surface-muted hover:text-orange-600"
                            aria-label={`Edit ${product.name}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => requestDelete(product)}
                            className="rounded-md p-2 text-text-secondary hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${product.name}`}
                            title="Delete"
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

          {pageData.total_pages > 1 && (
            <div className="mt-6">
              <Pagination
                page={pageData.page}
                totalPages={pageData.total_pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/60 p-4"
          onMouseDown={cancelDelete}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-surface p-6 shadow-elevated"
          >
            <h2 id="delete-product-title" className="text-lg font-semibold text-text-primary">
              Delete product
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={cancelDelete} disabled={deleting}>
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

export default ProductsAdminPage;