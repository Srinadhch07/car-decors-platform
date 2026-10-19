import type { GalleryMediaType } from "../../types/api";

/**
 * Client-side mirrors of the backend Work Gallery media limits.
 *
 * These values only drive fast pre-upload validation and UI copy; the backend
 * remains the authoritative validator (it content-sniffs the byte stream).
 */
export const GALLERY_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const GALLERY_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const GALLERY_BATCH_MAX_FILES = 10;

/** Extensions the backend accepts, mirrored for the file picker. */
export const GALLERY_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const GALLERY_VIDEO_EXTENSIONS = [".mp4"] as const;

export const GALLERY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const GALLERY_VIDEO_ACCEPT = "video/mp4";
export const GALLERY_ACCEPT = `${GALLERY_IMAGE_ACCEPT},${GALLERY_VIDEO_ACCEPT}`;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4"]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** Infer the media kind from a file's MIME type, falling back to its extension. */
export function detectMediaType(file: File): GalleryMediaType | null {
  if (IMAGE_MIME_TYPES.has(file.type)) return "image";
  if (VIDEO_MIME_TYPES.has(file.type)) return "video";
  const ext = extensionOf(file.name);
  if ((GALLERY_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return "image";
  if ((GALLERY_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return "video";
  return null;
}

/** Human-readable byte size (e.g. "1.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Validate a candidate upload against the gallery rules.
 *
 * Returns a human-readable error, or `null` when the file passes the client
 * checks. The backend still performs the authoritative validation.
 */
export function validateGalleryFile(file: File): string | null {
  const mediaType = detectMediaType(file);
  if (mediaType === null) {
    return "Unsupported file type. Use JPEG, PNG, WebP or MP4.";
  }
  const limit =
    mediaType === "image" ? GALLERY_IMAGE_MAX_BYTES : GALLERY_VIDEO_MAX_BYTES;
  if (file.size > limit) {
    return `${mediaType === "image" ? "Images" : "Videos"} must be ${formatBytes(
      limit,
    )} or smaller (this file is ${formatBytes(file.size)}).`;
  }
  return null;
}
