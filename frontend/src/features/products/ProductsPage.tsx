import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Filter, Search, X } from "lucide-react";
import type { Category, ProductAvailability, ProductListPage, Subcategory } from "../../types/api";
import { api } from "../../lib/api/client";
import { Container, EmptyState, ErrorState } from "../../components/ui";
import { useShopSettings } from "../../context/ShopSettingsContext";
import {
  DEFAULT_OG_IMAGE,
  FALLBACK_BRAND,
  buildBreadcrumbs,
  SITE_URL,
  type SeoData,
} from "../../lib/seo";
import { SeoHead } from "../../components/seo";
import { canAnimate } from "../../lib/motion/environment";
import { ProductGridCard } from "./ProductGridCard";
import { ProductSkeleton } from "./ProductSkeleton";
import { Pagination } from "./Pagination";
import { ActiveFilters } from "./ActiveFilters";
import { CategoryStrip } from "./CategoryStrip";
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

  // The grid entrance animation plays once on the first catalogue load and is
  // never replayed while filtering or paging (kept responsive).
  const gridRevealedRef = useRef(false);

  // SEO: unique title/description, canonical points at the clean /products URL
  const seo: SeoData = useMemo(
    () => ({
      title: `${shop?.shop_name ?? FALLBACK_BRAND} | Products`,
      description: `Browse all car accessories and car decor from ${shop?.shop_name ?? FALLBACK_BRAND}. Filter by category, availability and price, and get in touch on WhatsApp.`,
      canonicalPath: "/products",
      siteName: shop?.shop_name ?? FALLBACK_BRAND,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: buildBreadcrumbs(SITE_URL, [
        { name: "Home", path: "/" },
        { name: "Products", path: "/products" },
      ]),
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

  // Mark the grid as revealed after the first successful load so subsequent
  // filtering/pagination renders skip the entrance animation.
  useEffect(() => {
    if (!loading && products && products.items.length > 0) {
      gridRevealedRef.current = true;
    }
  }, [loading, products]);

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

  const animateGrid = canAnimate() && !gridRevealedRef.current;

  return (
    <div>
      <SeoHead data={seo} />

      {/* Compact automotive banner */}
      <section className="page-banner relative border-b border-dark-700">
        <div className="absolute inset-0 carbon-texture" aria-hidden="true" />
        <div
          aria-hidden="true"
          className="banner-grid pointer-events-none absolute inset-x-0 top-0 h-40"
        />
        <Container className="relative py-10 sm:py-12">
          <p className="eyebrow animate-card-enter">The Car Accessories Collection</p>
          <h1 className="animate-card-enter mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white [animation-delay:80ms] sm:text-4xl">
            Find the Perfect Upgrade for Your Drive
          </h1>
          <p className="animate-card-enter mt-3 max-w-xl text-sm text-gray-300 [animation-delay:160ms] sm:text-base">
            Explore accessories designed to make every drive more personal.
          </p>

          {/* Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="animate-card-enter mx-auto mt-6 flex max-w-xl items-center [animation-delay:240ms] sm:mx-0"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-full rounded-l-xl border border-dark-600 bg-dark-800 py-3 pl-11 pr-10 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-orange-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-r-xl bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </button>
          </form>
        </Container>
        <div aria-hidden="true" className="banner-edge absolute inset-x-0 bottom-0 h-px" />
      </section>

      <Container className="py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-sm text-text-muted">
          <Link to="/" className="transition-colors hover:text-orange-600">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium text-text-primary" aria-current="page">
            All Products
          </span>
        </nav>

        {/* Shop by category */}
        <CategoryStrip
          categories={categories}
          selectedCategory={category}
          onSelect={handleCategoryChange}
        />

        {/* Mobile: filter/sort bar */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={openDrawer}
            className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-4 py-3 text-sm font-medium text-text-secondary shadow-card transition-colors hover:border-orange-500/50 hover:text-orange-600"
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
              className="field"
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
              <label htmlFor="drawer-sort" className="field-label">
                Sort By
              </label>
              <select
                id="drawer-sort"
                value={drawerSort}
                onChange={(e) => setDrawerSort(e.target.value)}
                className="field"
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
              <label htmlFor="drawer-category" className="field-label">
                Category
              </label>
                <select
                  id="drawer-category"
                  value={drawerCategory}
                  onChange={(e) => {
                    setDrawerCategory(e.target.value);
                    setDrawerSubcategory("");
                  }}
                  className="field"
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
                <label htmlFor="drawer-subcategory" className="field-label">
                  Subcategory
                </label>
                <select
                  id="drawer-subcategory"
                  value={drawerSubcategory}
                  onChange={(e) => setDrawerSubcategory(e.target.value)}
                  className="field"
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
              <label htmlFor="drawer-vehicle" className="field-label">
                Vehicle
              </label>
              <input
                id="drawer-vehicle"
                type="text"
                value={drawerVehicle}
                onChange={(e) => setDrawerVehicle(e.target.value)}
                placeholder="e.g. Hyundai Creta"
                className="field"
              />
            </div>

            {/* Drawer availability */}
            <div>
              <label htmlFor="drawer-availability" className="field-label">
                Availability
              </label>
              <select
                id="drawer-availability"
                value={drawerAvailability}
                onChange={(e) => setDrawerAvailability(e.target.value as ProductAvailability | "")}
                className="field"
              >
                <option value="">All</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="ON_ORDER">On Order</option>
              </select>
            </div>

            <button
              type="button"
              onClick={applyDrawer}
              className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
            >
              Apply Filters
            </button>
          </div>
        </FilterDrawer>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[15rem_1fr]">
          {/* Desktop filter sidebar */}
          <aside className="hidden md:block">
            <div className="sticky top-24 card-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
                  Filters
                </h2>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              {filterContent}
            </div>
          </aside>

          <div>
            {/* Results toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                {loading ? (
                  <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
                ) : products ? (
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{products.total}</span>{" "}
                    product{products.total !== 1 ? "s" : ""}
                    {hasFilters ? " match your filters" : " available"}
                  </p>
                ) : null}
              </div>

              {/* Desktop sort */}
              <div className="hidden md:block">
                <label htmlFor="desktop-sort" className="sr-only">
                  Sort products
                </label>
                <select
                  id="desktop-sort"
                  value={sort}
                  onChange={(e) => updateParam("sort", e.target.value)}
                  className="field w-56"
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
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
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.items.map((product, index) => (
                  <div
                    key={product.id}
                    className={`h-full ${animateGrid ? "animate-card-enter" : ""}`}
                    style={
                      animateGrid
                        ? { animationDelay: `${Math.min(index, 7) * 45}ms` }
                        : undefined
                    }
                  >
                    <ProductGridCard product={product} />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && products && products.items.length === 0 && (
              <EmptyState
                title="No products found"
                description={
                  hasFilters
                    ? "No products match your current filters. Try adjusting your search or filter criteria."
                    : "No products are available yet."
                }
                action={
                  hasFilters ? (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 active:bg-orange-800"
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
