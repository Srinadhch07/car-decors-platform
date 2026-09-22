import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layers, Package, Store, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../../../lib/api/client";
import { useAdminAuth } from "../../../features/admin/auth";
import type { ShopSettings } from "../../../types/api";

interface QuickAction {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    to: "/admin/products",
    label: "Manage Products",
    description: "Add, edit or deactivate products and pricing",
    icon: Package,
  },
  {
    to: "/admin/categories",
    label: "Categories",
    description: "Reorganize the category tree",
    icon: Tags,
  },
  {
    to: "/admin/subcategories",
    label: "Subcategories",
    description: "Nested options under each category",
    icon: Layers,
  },
  {
    to: "/admin/shop",
    label: "Shop Settings",
    description: "Phone, hours, socials and branding",
    icon: Store,
  },
];

type StatKey = "products" | "categories" | "subcategories";

type StatCounts = Record<StatKey, string>;

const PLACEHOLDER_COUNTS: StatCounts = { products: "—", categories: "—", subcategories: "—" };

const STATS: Array<{ key: StatKey; label: string }> = [
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "subcategories", label: "Subcategories" },
];

export function DashboardPage() {
  const { session } = useAdminAuth();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [counts, setCounts] = useState<StatCounts>(PLACEHOLDER_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shop, products, categories, subcategories] = await Promise.all([
        api.adminGetShop(),
        api.adminListProducts({ page: 1, page_size: 1 }),
        api.adminListCategories(),
        api.adminListSubcategories(),
      ]);
      setSettings(shop);
      setCounts({
        products: String(products.total),
        categories: String(categories.length),
        subcategories: String(subcategories.length),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.title = "Admin Dashboard | Car Decor";
  }, []);

  const socialCount = settings ? Object.keys(settings.social_links).length : 0;

  return (
    <section className="space-y-6" aria-label="Admin dashboard">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-text-secondary">
          Welcome back{session?.email ? `, ${session.email}` : ""}. Here is what is happening at
          {settings?.shop_name ? ` ${settings.shop_name}` : " the shop"} today.
        </p>
      </header>

      {/* Quick stats (live totals from admin APIs) */}
      <div className="grid gap-4 sm:grid-cols-3" aria-label="Quick stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border-light bg-white p-5 shadow-card">
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary" aria-hidden="true">
              {counts[stat.key]}
            </p>
          </div>
        ))}
      </div>

      {/* Live shop settings snapshot */}
      <div className="rounded-lg border border-border-light bg-white p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-text-primary">
          <Store className="h-4 w-4 text-orange-600" aria-hidden="true" />
          Shop
        </h2>
        {loading && (
          <div className="flex items-center gap-3 py-3 text-text-muted" aria-busy="true">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-orange-500" />
            <span className="text-sm">Loading shop settings…</span>
          </div>
        )}
        {!loading && error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 py-2">
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && settings && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-border-light pb-1">
              <dt className="text-text-muted">Shop name</dt>
              <dd className="font-medium text-text-primary">{settings.shop_name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border-light pb-1">
              <dt className="text-text-muted">Phone</dt>
              <dd className="font-medium text-text-primary">{settings.phone}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border-light pb-1">
              <dt className="text-text-muted">Email</dt>
              <dd className="font-medium text-text-primary">{settings.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border-light pb-1">
              <dt className="text-text-muted">Hours</dt>
              <dd className="font-medium text-text-primary">{settings.business_hours ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border-light pb-1">
              <dt className="text-text-muted">Address</dt>
              <dd className="font-medium text-text-primary">{settings.address}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border-light pb-1">
              <dt className="text-text-muted">Social links</dt>
              <dd className="font-medium text-text-primary">
                {socialCount === 0 ? "None" : `${socialCount} configured`}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group rounded-lg border border-border-light bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-orange-50 p-2.5">
                <action.icon className="h-5 w-5 text-orange-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary group-hover:text-orange-700">
                  {action.label}
                </h3>
                <p className="mt-0.5 text-sm text-text-secondary">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default DashboardPage;