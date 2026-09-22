import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Container,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeading,
} from "../../../components/ui";
import { useShopSettings } from "../../../context/ShopSettingsContext";
import { CategorySelect } from "../../../features/admin/catalog/CategorySelect";
import { SubcategoryForm } from "../../../features/admin/catalog/SubcategoryForm";
import { useAdminCategories } from "../../../features/admin/catalog/useAdminCategories";
import { useAdminSubcategories } from "../../../features/admin/catalog/useAdminSubcategories";
import { toAdminError } from "../../../features/admin/catalog/helpers";
import type { Subcategory, SubcategoryCreatePayload } from "../../../types/api";

const rowActionClass =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium " +
  "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-orange-500";

export function SubcategoriesAdminPage() {
  const { data: shop } = useShopSettings();
  const { categories } = useAdminCategories();
  const {
    subcategories,
    loading,
    error,
    actionError,
    refresh,
    create,
    update,
    remove,
  } = useAdminSubcategories();

  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = `Subcategories | ${shop?.shop_name ?? "Car Decor"}`;
  }, [shop]);

  const visibleSubcategories = useMemo(() => {
    if (!filterCategoryId) return subcategories;
    return subcategories.filter((sub) => sub.category_id === filterCategoryId);
  }, [subcategories, filterCategoryId]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((cat) => [cat.id, cat.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories]);

  const openCreate = () => {
    setFormOpen(true);
    setEditing(null);
    setFormError(null);
  };

  const openEdit = (subcategory: Subcategory) => {
    setFormOpen(true);
    setEditing(subcategory);
    setFormError(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: SubcategoryCreatePayload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await update(editing.id, payload);
      } else {
        await create(payload);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(toAdminError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (subcategory: Subcategory) => {
    setFormError(null);
    setDeleteTarget(subcategory);
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // 409 and other failures stay visible via the confirm panel error below
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="section-y">
      <Container>
        <SectionHeading
          title="Subcategories"
          subtitle="Add a granular level of product organization under each category"
          action={
            !formOpen && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add subcategory
              </Button>
            )
          }
        />

        <div className="mb-8 max-w-xs">
          <CategorySelect
            id="subcategory-filter"
            label="Filter by category"
            value={filterCategoryId}
            onChange={setFilterCategoryId}
            categories={categories}
            includeAll
          />
        </div>

        {formOpen && (
          <SubcategoryForm
            key={editing?.id ?? "new"}
            subcategory={editing}
            categoryId={filterCategoryId}
            categories={categories}
            submitting={submitting}
            error={formError}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        )}

        {deleteTarget && (
          <div
            role="alertdialog"
            aria-label="Confirm delete"
            className="mb-8 rounded-lg border border-border-light bg-surface-muted p-4"
          >
            <p className="text-sm text-text-primary">
              Delete subcategory <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>?
              This cannot be undone.
            </p>
            {actionError && (
              <p role="alert" className="mt-2 text-sm font-medium text-error">
                {actionError.message}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                autoFocus
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-muted active:bg-surface-dim disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-red-700 active:bg-red-800 disabled:pointer-events-none disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete subcategory"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading subcategories…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : visibleSubcategories.length === 0 ? (
          <EmptyState
            title={
              filterCategoryId
                ? "No subcategories in this category"
                : "No subcategories yet"
            }
            description="Add a subcategory to refine how products are grouped."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add subcategory
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-muted text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Sort</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubcategories.map((subcategory) => (
                  <tr
                    key={subcategory.id}
                    className="border-b border-border-light last:border-0"
                  >
                    <td className="px-4 py-3 text-text-secondary">
                      {categoryName(subcategory.category_id)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {subcategory.name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{subcategory.slug}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {subcategory.sort_order}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={subcategory.is_active ? "success" : "default"}>
                        {subcategory.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(subcategory)}
                          className={`${rowActionClass} text-text-secondary hover:bg-surface-muted hover:text-text-primary`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(subcategory)}
                          className={`${rowActionClass} text-red-600 hover:bg-red-50 hover:text-red-700`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );
}