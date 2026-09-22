import { useEffect, useState } from "react";
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
import { CategoryForm } from "../../../features/admin/catalog/CategoryForm";
import { useAdminCategories } from "../../../features/admin/catalog/useAdminCategories";
import { toAdminError } from "../../../features/admin/catalog/helpers";
import type { Category, CategoryCreatePayload } from "../../../types/api";

const rowActionClass =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium " +
  "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-orange-500";

export function CategoriesAdminPage() {
  const { data: shop } = useShopSettings();
  const {
    categories,
    loading,
    error,
    actionError,
    refresh,
    create,
    update,
    remove,
  } = useAdminCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = `Categories | ${shop?.shop_name ?? "Car Decor"}`;
  }, [shop]);

  const openCreate = () => {
    setFormOpen(true);
    setEditing(null);
    setFormError(null);
  };

  const openEdit = (category: Category) => {
    setFormOpen(true);
    setEditing(category);
    setFormError(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (payload: CategoryCreatePayload) => {
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

  const openDelete = (category: Category) => {
    setFormError(null);
    setDeleteTarget(category);
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
          title="Categories"
          subtitle="Organize your catalog into top-level product categories"
          action={
            !formOpen && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add category
              </Button>
            )
          }
        />

        {formOpen && (
          <CategoryForm
            key={editing?.id ?? "new"}
            category={editing}
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
              Delete category <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>?
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
                {deleting ? "Deleting…" : "Delete category"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading categories…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Add your first category to start organizing products."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add category
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-light">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-muted text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Sort</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-border-light last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {category.name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{category.slug}</td>
                    <td className="px-4 py-3 text-text-secondary">{category.sort_order}</td>
                    <td className="px-4 py-3">
                      <Badge variant={category.is_active ? "success" : "default"}>
                        {category.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className={`${rowActionClass} text-text-secondary hover:bg-surface-muted hover:text-text-primary`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(category)}
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