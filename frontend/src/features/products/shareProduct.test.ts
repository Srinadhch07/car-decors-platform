import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildProductShareUrl,
  buildWhatsAppShareUrl,
  getPublicSiteUrl,
} from "./shareProduct";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicSiteUrl", () => {
  it("prefers an explicitly configured site URL", () => {
    vi.stubEnv("VITE_SITE_URL", "https://car-decors.duckdns.org/");
    expect(getPublicSiteUrl()).toBe("https://car-decors.duckdns.org");
  });

  it("falls back to the current window origin", () => {
    expect(getPublicSiteUrl()).toBe(window.location.origin);
  });
});

describe("buildProductShareUrl", () => {
  it("builds an absolute product-detail URL for the production domain", () => {
    expect(buildProductShareUrl("leather-seat-cover")).toBe(
      `${window.location.origin}/products/leather-seat-cover`,
    );
  });

  it("accepts an explicit base origin (production)", () => {
    expect(buildProductShareUrl("floor-mat", "https://car-decors.duckdns.org")).toBe(
      "https://car-decors.duckdns.org/products/floor-mat",
    );
  });

  it("normalises a trailing slash on the base origin (local dev)", () => {
    expect(buildProductShareUrl("floor-mat", "http://localhost:5173/")).toBe(
      "http://localhost:5173/products/floor-mat",
    );
  });

  it("encodes slugs safely", () => {
    expect(buildProductShareUrl("a b/c", "https://example.test")).toBe(
      "https://example.test/products/a%20b%2Fc",
    );
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("encodes the product name and product URL into the message", () => {
    const url = buildWhatsAppShareUrl(
      "Leather Seat Cover",
      "https://car-decors.duckdns.org/products/leather-seat-cover",
    );
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const message = decodeURIComponent(url.split("text=")[1]);
    expect(message).toContain("Leather Seat Cover");
    expect(message).toContain(
      "https://car-decors.duckdns.org/products/leather-seat-cover",
    );
  });
});
