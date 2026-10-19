import { type ChangeEvent, type DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { Film, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { api } from "../../../lib/api/client";
import {
  GALLERY_ACCEPT,
  GALLERY_BATCH_MAX_FILES,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_VIDEO_MAX_BYTES,
  detectMediaType,
  formatBytes,
  validateGalleryFile,
} from "../../../lib/gallery/media";
import type { AdminGalleryItem, GalleryBatchFailure } from "../../../types/api";
import { Button } from "../../../components/ui";

interface SelectedFile {
  id: number;
  file: File;
  error: string | null;
  previewUrl: string | null;
}

interface GalleryUploadPanelProps {
  onUploaded: (items: AdminGalleryItem[], failures: GalleryBatchFailure[]) => void;
}

const fieldCls =
  "w-full rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

const formatHint = `JPEG, PNG or WebP up to ${formatBytes(
  GALLERY_IMAGE_MAX_BYTES,
)} · MP4 up to ${formatBytes(GALLERY_VIDEO_MAX_BYTES)} · max ${GALLERY_BATCH_MAX_FILES} files`;

function buildSelected(id: number, file: File): SelectedFile {
  const error = validateGalleryFile(file);
  let previewUrl: string | null = null;
  if (error === null && detectMediaType(file) === "image") {
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      previewUrl = null;
    }
  }
  return { id, file, error, previewUrl };
}

export function GalleryUploadPanel({ onUploaded }: GalleryUploadPanelProps) {
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const idRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<SelectedFile[]>([]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Revoke every outstanding object URL when the panel unmounts.
  useEffect(() => {
    return () => {
      for (const item of selectedRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    setFormError(null);
    setSelected((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        idRef.current += 1;
        next.push(buildSelected(idRef.current, file));
      }
      return next;
    });
  }, []);

  const removeFile = useCallback((id: number) => {
    setSelected((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const clearSelected = useCallback(() => {
    setSelected((prev) => {
      for (const item of prev) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
    },
    [addFiles],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) addFiles(event.target.files);
      event.target.value = "";
    },
    [addFiles],
  );

  const invalidCount = selected.filter((item) => item.error !== null).length;
  const tooMany = selected.length > GALLERY_BATCH_MAX_FILES;
  const canUpload = !uploading && invalidCount === 0 && selected.length > 0 && !tooMany;

  const handleUpload = useCallback(async () => {
    if (!canUpload) return;
    setUploading(true);
    setFormError(null);
    const files = selected.map((item) => item.file);
    const meta = {
      category: category.trim() ? category.trim() : null,
      description: description.trim(),
    };
    try {
      if (files.length === 1) {
        const item = await api.adminCreateGallery(meta, files[0]);
        onUploaded([item], []);
      } else {
        const result = await api.adminCreateGalleryBatch(files, meta);
        onUploaded(result.items, result.failures);
      }
      clearSelected();
      setCategory("");
      setDescription("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [canUpload, selected, category, description, onUploaded, clearSelected]);

  return (
    <section
      aria-label="Upload media"
      className="mb-6 rounded-lg border border-border-light bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Add media</h2>
          <p className="mt-1 text-xs text-text-muted">{formatHint}</p>
        </div>
        {selected.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={clearSelected} disabled={uploading}>
            Clear
          </Button>
        )}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? "border-orange-500 bg-orange-50" : "border-border bg-surface-muted"
        }`}
      >
        <ImagePlus className="h-8 w-8 text-text-muted" aria-hidden="true" />
        <p className="text-sm text-text-secondary">Drag &amp; drop files here, or</p>
        <label
          htmlFor="gallery-upload-input"
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted"
        >
          <Upload className="h-4 w-4" />
          Choose files
        </label>
        <input
          ref={inputRef}
          id="gallery-upload-input"
          type="file"
          multiple
          accept={GALLERY_ACCEPT}
          onChange={handleInputChange}
          className="sr-only"
        />
      </div>

      {selected.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Selected files">
          {selected.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-border-light bg-surface-muted/60 p-2"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-light bg-white">
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Film className="h-5 w-5 text-text-muted" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-primary">
                  {item.file.name}
                </span>
                <span className="block text-xs text-text-muted">
                  {formatBytes(item.file.size)}
                  {item.error ? <span className="ml-1 text-red-600">· {item.error}</span> : null}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(item.id)}
                aria-label={`Remove ${item.file.name}`}
                className="rounded-md p-2 text-text-muted hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="gallery-upload-category"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Category (optional)
            </label>
            <input
              id="gallery-upload-category"
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
              htmlFor="gallery-upload-description"
              className="mb-1 block text-sm font-medium text-text-primary"
            >
              Description (optional)
            </label>
            <input
              id="gallery-upload-description"
              type="text"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Shared across the uploaded items"
              className={fieldCls}
            />
          </div>
        </div>
      )}

      {(formError || tooMany || invalidCount > 0) && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError ??
            (tooMany
              ? `At most ${GALLERY_BATCH_MAX_FILES} files are allowed per batch.`
              : "Fix the highlighted files before uploading.")}
        </p>
      )}

      {selected.length > 0 && (
        <div className="mt-4">
          <Button type="button" onClick={() => void handleUpload()} disabled={!canUpload}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload {selected.length} {selected.length === 1 ? "file" : "files"}
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}

export default GalleryUploadPanel;
