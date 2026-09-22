import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Category, ProductListPage, Subcategory } from "../../types/api";
import { ApiRequestError, api } from "../../lib/api/client";
import { Container, EmptyState, ErrorState } from "../../components/ui";
import { useShopSettings } from "../../context/ShopSettingsContext";
import { ProductCard } from "../home/ProductCard";
import { ProductSkeleton } from "../products/ProductSkeleton";
import { Pagination } from "../products/Pagination";

interface CategoryDetailProps {
  slug: string;
}

export function CategoryDetail({ slug }: CategoryDetailProps) {
  const { data: shop } = useShopSettings();
  const [params, setParams] = useSearchParams();

  const subcategory = params.get("subcategory") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<ProductListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SEO
  useEffect(() => {
    if (category) {
      document.title = `${category.name} | ${shop?.shop_name ?? "Car Decor"}`;
    }
  }, [category, shop]);

  // Fetch category
  useEffect(() => {
    let cancelled = false;
    api
      .getCategory(slug)
      .then((data) => {
        if (!cancelled) setCategory(data);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiRequestError && err.status === 404) {
            setError("Category not found");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load category");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Fetch subcategories
  useEffect(() => {
    let cancelled = false;
    api
      .getSubcategories(slug)
      .then((data) => {
        if (!cancelled) setSubcategories(data.filter((s) => s.is_active));
      })
      .catch(() => {
        if (!cancelled) setSubcategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Fetch products
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const queryParams: Record<string, string | number> = {
      category: slug,
      sort,
      page,
      page_size: 20,
    };
    if (subcategory) queryParams.subcategory = subcategory;

    api
      .getProducts(queryParams)
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiRequestError && err.status === 404) {
            setError("Category not found");
          } else {
            setError(err instanceof Error ? err.message : "Failed to load products");
          }
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, subcategory, sort, page]);

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
    (newPage: number) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(newPage));
        return next;
      });
    },
    [setParams],
  );

  const sortOptions = useMemo(
    () => [
      { value: "newest", label: "Newest First" },
      { value: "oldest", label: "Oldest First" },
      { value: "name_asc", label: "Name: A to Z" },
      { value: "name_desc", label: "Name: Z to A" },
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
    ],
    [],
  );

  // --- Loading skeleton ---
  if (loading && !category && !error) {
    return (
      <section className="section-y">
        <Container>
          <div className="animate-pulse space-y-8">
            <div className="h-6 w-64 rounded bg-surface-muted" />
            <div className="h-4 w-96 rounded bg-surface-muted" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // --- Error / 404 ---
  if (error === "Category not found") {
    return (
      <section className="section-y">
        <Container>
          <div className="py-16 text-center">
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Category Not Found</h1>
            <p className="mb-6 text-text-secondary">
              The category you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Browse All Products
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  if (error && !category) {
    return (
      <section className="section-y">
        <Container>
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </Container>
      </section>
    );
  }

  if (!category) return null;

  return (
    <div>
      {/* Breadcrumb */}
      <section className="border-b border-border-light bg-surface-muted">
        <Container className="py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-muted">
            <Link to="/" className="hover:text-orange-600">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/products" className="hover:text-orange-600">
              Products
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-text-primary font-medium">{category.name}</span>
          </nav>
        </Container>
      </section>

      {/* Category hero */}
      <section className="border-b border-border-light bg-white">
        <Container className="py-8 sm:py-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            {/* Category image */}
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-border-light bg-surface-muted sm:h-44 sm:w-44">
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/category-fallback.svg";
                  }}
                />
              ) : (
                <img
                  src="/images/category-fallback.svg"
                  alt=""
                  className="h-full w-full object-cover opacity-60"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Heading */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                {category.name}
              </h1>
              {category.description && (
                <p className="mx-auto mt-2 max-w-xl leading-relaxed text-text-secondary sm:mx-0">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-6 sm:py-8">
        {/* Subcategory pills */}
        {subcategories.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => updateParam("subcategory", "")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                !subcategory
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-border-light bg-white text-text-secondary hover:bg-surface-muted"
              }`}
            >
              All {category.name}
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub.slug}
                type="button"
                onClick={() => updateParam("subcategory", sub.slug)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  subcategory === sub.slug
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-border-light bg-white text-text-secondary hover:bg-surface-muted"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Sort + result count */}
        <div className="mb-4 flex items-center justify-between">
          {loading ? (
            <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
          ) : products ? (
            <p className="text-sm text-text-secondary">
              {products.total} product{products.total !== 1 ? "s" : ""} found
            </p>
          ) : null}

          <div>
            <label htmlFor="cat-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="cat-sort"
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error during load */}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        )}

        {/* Products grid */}
        {!loading && !error && products && products.items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products && products.items.length === 0 && (
          <EmptyState
            title={
              subcategory
                ? "No products in this subcategory"
                : "No products in this category"
            }
            description={
              subcategory
                ? "Try selecting a different subcategory."
                : "No products are available in this category yet."
            }
            action={
              subcategory ? (
                <button
                  type="button"
                  onClick={() => updateParam("subcategory", "")}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  View all {category.name}
                </button>
              ) : (
                <Link
                  to="/products"
                  className="inline-block rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  Browse All Products
                </Link>
              )
            }
          />
        )}

        {/* Pagination */}
        {!loading && !error && products && products.total_pages > 1 && (
          <div className="mt-8">
            <Pagination
              page={products.page}
              totalPages={products.total_pages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
