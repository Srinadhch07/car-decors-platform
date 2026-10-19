import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { api } from "../../../lib/api/client";
import { GALLERY_ACCEPT, formatBytes, validateGalleryFile } from "../../../lib/gallery/media";
import type { AdminGalleryItem, GalleryUpdatePayload } from "../../../types/api";
import { Button } from "../../../components/ui";

interface GalleryEditDialogProps {
  item: AdminGalleryItem;
  onClose: () => void;
  onSaved: (item: AdminGalleryItem) => void;
}

const MAX_DISPLAY_ORDER = 1_000_000;

const fieldCls =
  "w-full rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

export function GalleryEditDialog({ item, onClose, onSaved }: GalleryEditDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState(item.category ?? "");
  const [order, setOrder] = useState(String(item.display_order));
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (!selected) {
      setFile(null);
      setFileError(null);
      setPreviewUrl(null);
      return;
    }
    const problem = validateGalleryFile(selected);
    if (problem) {
      setFile(null);
      setFileError(problem);
      setPreviewUrl(null);
      return;
    }
    let url: string | null = null;
    try {
      url = URL.createObjectURL(selected);
    } catch {
      url = null;
    }
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFileError(null);
    setFile(selected);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("A title is required.");
      return;
    }
    const orderValue = Number(order);
    if (!Number.isInteger(orderValue) || orderValue < 0 || orderValue > MAX_DISPLAY_ORDER) {
      setFormError("Display order must be a whole number between 0 and 1,000,000.");
      return;
    }

    const payload: GalleryUpdatePayload = {
      title: trimmedTitle,
      description: description.trim(),
      display_order: orderValue,
    };
    if (category.trim()) {
      payload.category = category.trim();
    } else {
      payload.clear_fields = ["category"];
    }

    setSaving(true);
    setFormError(null);
    try {
      onSaved(await api.adminUpdateGallery(item.id, payload, file));
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save the item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/60 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-gallery-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-6 shadow-elevated"
      >
        <h2 id="edit-gallery-title" className="text-lg font-semibold text-text-primary">
          Edit gallery item
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}

          <div className="overflow-hidden rounded-md border border-border-light bg-surface-muted">
            {previewUrl && file?.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
                className="max-h-56 w-full bg-black object-contain"
              />
            ) : (
              <img
                src={previewUrl ?? item.url}
                alt=""
                className="max-h-56 w-full object-contain"
              />
            )}
          </div>

          <div>
            <label
              htmlFor="edit-gallery-file"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Replace media (optional)
            </label>
            <input
              id="edit-gallery-file"
              type="file"
              accept={GALLERY_ACCEPT}
              onChange={handleFile}
              className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-text-secondary hover:file:bg-surface-dim"
            />
            {file && (
              <p className="mt-1 text-xs text-text-muted">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
            {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
          </div>

          <div>
            <label
              htmlFor="edit-gallery-title-input"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Title
            </label>
            <input
              id="edit-gallery-title-input"
              type="text"
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldCls}
            />
          </div>

          <div>
            <label
              htmlFor="edit-gallery-description"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Description
            </label>
            <textarea
              id="edit-gallery-description"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldCls}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-gallery-category"
                className="mb-1 block text-sm font-medium text-text-primary"
              >
                Category (optional)
              </label>
              <input
                id="edit-gallery-category"
                type="text"
                maxLength={80}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. Interior"
                className={fieldCls}
              />
            </div>
            <div>
              <label
                htmlFor="edit-gallery-order"
                className="mb-1 block text-sm font-medium text-text-primary"
              >
                Display order
              </label>
              <input
                id="edit-gallery-order"
                type="number"
                min={0}
                max={MAX_DISPLAY_ORDER}
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GalleryEditDialog;
