import { describe, expect, it } from "vitest";
import {
  GALLERY_BATCH_MAX_FILES,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_VIDEO_MAX_BYTES,
  detectMediaType,
  formatBytes,
  validateGalleryFile,
} from "./media";

function makeFile(name: string, type: string, size?: number): File {
  const file = new File(["data"], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

describe("detectMediaType", () => {
  it("detects images by mime type", () => {
    expect(detectMediaType(makeFile("a.jpg", "image/jpeg"))).toBe("image");
    expect(detectMediaType(makeFile("a.png", "image/png"))).toBe("image");
    expect(detectMediaType(makeFile("a.webp", "image/webp"))).toBe("image");
  });

  it("detects video by mime type", () => {
    expect(detectMediaType(makeFile("clip.mp4", "video/mp4"))).toBe("video");
  });

  it("falls back to the extension when the mime type is missing", () => {
    expect(detectMediaType(makeFile("photo.JPEG", ""))).toBe("image");
    expect(detectMediaType(makeFile("clip.mp4", ""))).toBe("video");
  });

  it("returns null for unsupported types", () => {
    expect(detectMediaType(makeFile("doc.pdf", "application/pdf"))).toBeNull();
    expect(detectMediaType(makeFile("clip.mov", "video/quicktime"))).toBeNull();
  });
});

describe("validateGalleryFile", () => {
  it("accepts supported files within the size limits", () => {
    expect(validateGalleryFile(makeFile("a.jpg", "image/jpeg", GALLERY_IMAGE_MAX_BYTES))).toBeNull();
    expect(validateGalleryFile(makeFile("b.mp4", "video/mp4", GALLERY_VIDEO_MAX_BYTES))).toBeNull();
  });

  it("rejects unsupported types", () => {
    expect(validateGalleryFile(makeFile("doc.pdf", "application/pdf"))).toMatch(/unsupported/i);
  });

  it("rejects images larger than the image limit", () => {
    const message = validateGalleryFile(
      makeFile("big.jpg", "image/jpeg", GALLERY_IMAGE_MAX_BYTES + 1),
    );
    expect(message).toMatch(/images must be/i);
  });

  it("rejects videos larger than the video limit", () => {
    const message = validateGalleryFile(
      makeFile("big.mp4", "video/mp4", GALLERY_VIDEO_MAX_BYTES + 1),
    );
    expect(message).toMatch(/videos must be/i);
  });
});

describe("formatBytes", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});

describe("gallery limits", () => {
  it("mirrors the backend defaults", () => {
    expect(GALLERY_IMAGE_MAX_BYTES).toBe(4 * 1024 * 1024);
    expect(GALLERY_VIDEO_MAX_BYTES).toBe(25 * 1024 * 1024);
    expect(GALLERY_BATCH_MAX_FILES).toBe(10);
  });
});
