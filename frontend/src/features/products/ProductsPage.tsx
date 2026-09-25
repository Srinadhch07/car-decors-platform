import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Search, X } from "lucide-react";
import type { Category, ProductAvailability, ProductListPage, Subcategory } from "../../types/api";
import { api } from "../../lib/api/client";
import { Container, SectionHeading, EmptyState, ErrorState } from "../../components/ui";
import { useShopSettings } from "../../context/ShopSettingsContext";
import { DEFAULT_OG_IMAGE, FALLBACK_BRAND, type SeoData } from "../../lib/seo";
import { SeoHead } from "../../components/seo";
import { ProductCard } from "../home/ProductCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { Pagination } from "./Pagination";
import { ActiveFilters } from "./ActiveFilters";
import { FilterSidebar } from "./FilterSidebar";
import { FilterDrawer } from "./FilterDrawer";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function ProductsPage() {
  const { data: shop } = useShopSettings();
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const subcategory = params.get("subcategory") ?? "";
  const vehicle = params.get("vehicle") ?? "";
  const availability = (params.get("availability") ?? "") as ProductAvailability | "";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const prevSearchRef = useRef(search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState(category);
  const [drawerSubcategory, setDrawerSubcategory] = useState(subcategory);
  const [drawerAvailability, setDrawerAvailability] = useState<ProductAvailability | "">(availability);
  const [drawerSort, setDrawerSort] = useState(sort);
  const [drawerVehicle, setDrawerVehicle] = useState(vehicle);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<ProductListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SEO: unique title/description, canonical points at the clean /products URL
  const seo: SeoData = useMemo(
    () => ({
      title: `${shop?.shop_name ?? FALLBACK_BRAND} | Products`,
      description: `Browse all car accessories and car decor from ${shop?.shop_name ?? FALLBACK_BRAND}. Filter by category, availability and price, and get in touch on WhatsApp.`,
      canonicalPath: "/products",
      siteName: shop?.shop_name ?? FALLBACK_BRAND,
      ogImage: DEFAULT_OG_IMAGE,
    }),
    [shop],
  );

  // Load categories on mount
  useEffect(() => {
    let cancelled = false;
    api.getCategories().then((data) => {
      if (!cancelled) setCategories(data.filter((c) => c.is_active));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (!category) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    api.getSubcategories(category).then((data) => {
      if (!cancelled) setSubcategories(data.filter((s) => s.is_active));
    }).catch(() => {
      if (!cancelled) setSubcategories([]);
    });
    return () => { cancelled = true; };
  }, [category]);

  // Sync search input with URL
  useEffect(() => {
    if (search !== prevSearchRef.current) {
      setSearchInput(search);
      prevSearchRef.current = search;
    }
  }, [search]);

  // Fetch products
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const queryParams: Record<string, string | number> = { sort, page, page_size: 20 };
    if (search) queryParams.search = search;
    if (category) queryParams.category = category;
    if (subcategory) queryParams.subcategory = subcategory;
    if (vehicle) queryParams.vehicle = vehicle;
    if (availability) queryParams.availability = availability;

    api.getProducts(queryParams).then((data) => {
      if (!cancelled) {
        setProducts(data);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : "Failed to load products";
        setError(message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [search, category, subcategory, vehicle, availability, sort, page]);

  // --- URL update helpers ---

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

  const handleCategoryChange = useCallback(
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

  const handleRemoveFilter = useCallback(
    (key: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        next.delete("page");
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

  // --- Mobile drawer ---

  const openDrawer = useCallback(() => {
    setDrawerCategory(category);
    setDrawerSubcategory(subcategory);
    setDrawerAvailability(availability);
    setDrawerSort(sort);
    setDrawerVehicle(vehicle);
    setDrawerOpen(true);
  }, [category, subcategory, availability, sort, vehicle]);

  const applyDrawer = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      const set = (k: string, v: string) => {
        if (v) next.set(k, v);
        else next.delete(k);
      };
      set("category", drawerCategory);
      set("subcategory", drawerSubcategory);
      set("availability", drawerAvailability);
      set("sort", drawerSort);
      set("vehicle", drawerVehicle);
      next.delete("page");
      return next;
    });
    setDrawerOpen(false);
  }, [drawerCategory, drawerSubcategory, drawerAvailability, drawerSort, drawerVehicle, setParams]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // --- Active filter chips ---

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (search) chips.push({ key: "search", label: `"${search}"` });
    if (category) {
      const cat = categories.find((c) => c.slug === category);
      chips.push({ key: "category", label: cat?.name ?? category });
    }
    if (subcategory) {
      const sub = subcategories.find((s) => s.slug === subcategory);
      chips.push({ key: "subcategory", label: sub?.name ?? subcategory });
    }
    if (vehicle) chips.push({ key: "vehicle", label: vehicle });
    if (availability) {
      const labels: Record<string, string> = {
        IN_STOCK: "In Stock",
        OUT_OF_STOCK: "Out of Stock",
        ON_ORDER: "On Order",
      };
      chips.push({ key: "availability", label: labels[availability] ?? availability });
    }
    return chips;
  }, [search, category, subcategory, vehicle, availability, categories, subcategories]);

  const hasFilters = activeChips.length > 0;

  const filterContent = (
    <FilterSidebar
      categories={categories}
      subcategories={subcategories.map((s) => ({ name: s.name, slug: s.slug }))}
      selectedCategory={category}
      selectedSubcategory={subcategory}
      selectedAvailability={availability}
      selectedSort={sort}
      vehicle={vehicle}
      onCategoryChange={handleCategoryChange}
      onSubcategoryChange={(v) => updateParam("subcategory", v)}
      onAvailabilityChange={(v) => updateParam("availability", v)}
      onSortChange={(v) => updateParam("sort", v)}
      onVehicleChange={(v) => updateParam("vehicle", v)}
    />
  );

  return (
    <div>
      <SeoHead data={seo} />
      {/* Header */}
      <section className="border-b border-border-light bg-surface-muted">
        <Container className="py-8 sm:py-10">
          <SectionHeading
            title="All Products"
            subtitle="Browse our range of car accessories and decor"
            centered
          />

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="mx-auto mt-6 flex max-w-xl items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-full rounded-l-lg border border-r-0 border-border-light bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-muted hover:text-text-primary"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="rounded-r-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              Search
            </button>
          </form>
        </Container>
      </section>

      <Container className="py-6 sm:py-8">
        {/* Mobile: filter/sort bar */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={openDrawer}
            className="inline-flex items-center gap-2 rounded-md border border-border-light bg-white px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted"
            aria-label="Open filters"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <div className="flex-1">
            <label htmlFor="mobile-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="mobile-sort"
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        <div className="mb-4">
          <ActiveFilters
            filters={activeChips}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Mobile filter drawer */}
        <FilterDrawer open={drawerOpen} onClose={closeDrawer}>
          <div className="space-y-6">
            {/* Drawer sort */}
            <div>
              <label htmlFor="drawer-sort" className="mb-2 block text-sm font-semibold text-text-primary">
                Sort By
              </label>
              <select
                id="drawer-sort"
                value={drawerSort}
                onChange={(e) => setDrawerSort(e.target.value)}
                className="w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Drawer category */}
            <div>
              <label htmlFor="drawer-category" className="mb-2 block text-sm font-semibold text-text-primary">
                Category
              </label>
              <select
                id="drawer-category"
                value={drawerCategory}
                onChange={(e) => {
                  setDrawerCategory(e.target.value);
                  setDrawerSubcategory("");
                }}
                className="w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Drawer subcategory */}
            {drawerCategory && subcategories.length > 0 && (
              <div>
                <label htmlFor="drawer-subcategory" className="mb-2 block text-sm font-semibold text-text-primary">
                  Subcategory
                </label>
                <select
                  id="drawer-subcategory"
                  value={drawerSubcategory}
                  onChange={(e) => setDrawerSubcategory(e.target.value)}
                  className="w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">All Subcategories</option>
                  {subcategories.map((sub) => (
                    <option key={sub.slug} value={sub.slug}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Drawer vehicle */}
            <div>
              <label htmlFor="drawer-vehicle" className="mb-2 block text-sm font-semibold text-text-primary">
                Vehicle
              </label>
              <input
                id="drawer-vehicle"
                type="text"
                value={drawerVehicle}
                onChange={(e) => setDrawerVehicle(e.target.value)}
                placeholder="e.g. Hyundai Creta"
                className="w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Drawer availability */}
            <div>
              <label htmlFor="drawer-availability" className="mb-2 block text-sm font-semibold text-text-primary">
                Availability
              </label>
              <select
                id="drawer-availability"
                value={drawerAvailability}
                onChange={(e) => setDrawerAvailability(e.target.value as ProductAvailability | "")}
                className="w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="ON_ORDER">On Order</option>
              </select>
            </div>

            {/* Apply button */}
            <button
              type="button"
              onClick={applyDrawer}
              className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              Apply Filters
            </button>
          </div>
        </FilterDrawer>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-20">{filterContent}</div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Result count + desktop sort */}
            <div className="mb-4 flex items-center justify-between">
              {loading ? (
                <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
              ) : products ? (
                <p className="text-sm text-text-secondary">
                  {products.total} product{products.total !== 1 ? "s" : ""} found
                </p>
              ) : null}

              {/* Desktop sort */}
              <div className="hidden md:block">
                <label htmlFor="desktop-sort" className="sr-only">
                  Sort products
                </label>
                <select
                  id="desktop-sort"
                  value={sort}
                  onChange={(e) => updateParam("sort", e.target.value)}
                  className="rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <ErrorState message={error} onRetry={() => window.location.reload()} />
            )}

            {/* Products */}
            {!loading && !error && products && products.items.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {products.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && products && products.items.length === 0 && (
              <EmptyState
                title="No products found"
                description={
                  hasFilters
                    ? "Try adjusting your search or filter criteria."
                    : "No products are available yet."
                }
                action={
                  hasFilters ? (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                    >
                      Clear Filters
                    </button>
                  ) : undefined
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
          </div>
        </div>
      </Container>
    </div>
  );
}
