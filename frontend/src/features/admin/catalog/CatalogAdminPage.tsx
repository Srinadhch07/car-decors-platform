import { useState } from "react";
import { CategoriesAdminPage } from "../../../pages/admin/categories/CategoriesAdminPage";
import { SubcategoriesAdminPage } from "../../../pages/admin/subcategories/SubcategoriesAdminPage";

type Tab = "categories" | "subcategories";

const tabClass = (active: boolean) =>
  `inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 ` +
  (active
    ? "bg-orange-600 text-white shadow-sm"
    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary");

/**
 * Combined catalog admin entry point: categories + subcategories in one page.
 * Mounted by the admin shell under `/admin/catalog`; the two page components
 * are also exported for direct routing under `/admin/catalog/categories` and
 * `/admin/catalog/subcategories`.
 */
export default function CatalogAdminPage() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div>
      <div
        className="mb-6 inline-flex items-center gap-1 rounded-lg border border-border-light bg-surface-muted p-1"
        aria-label="Catalog sections"
      >
        <button
          type="button"
          aria-pressed={tab === "categories"}
          onClick={() => setTab("categories")}
          className={tabClass(tab === "categories")}
        >
          Categories
        </button>
        <button
          type="button"
          aria-pressed={tab === "subcategories"}
          onClick={() => setTab("subcategories")}
          className={tabClass(tab === "subcategories")}
        >
          Subcategories
        </button>
      </div>
      {tab === "categories" ? <CategoriesAdminPage /> : <SubcategoriesAdminPage />}
    </div>
  );
}