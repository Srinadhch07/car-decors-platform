import { SITE_URL } from "../../lib/seo";

/**
 * Resolve the public origin used to build absolute, shareable product links.
 *
 * Priority:
 *  1. `VITE_SITE_URL` when an operator sets an explicit canonical origin.
 *  2. The current window origin — correct in both local dev (:5173) and the
 *     deployed site, without hardcoding a production domain.
 *  3. The established canonical `SITE_URL` from lib/seo as a last resort
 *     (e.g. during server-side/test execution with no window).
 */
export function getPublicSiteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return SITE_URL.replace(/\/+$/, "");
}

/** Absolute URL of an individual product-detail page (never the listing). */
export function buildProductShareUrl(slug: string, base: string = getPublicSiteUrl()): string {
  return `${base.replace(/\/+$/, "")}/products/${encodeURIComponent(slug)}`;
}

/** WhatsApp "share to any contact" URL carrying the product name and link. */
export function buildWhatsAppShareUrl(productName: string, url: string): string {
  const message = `Check out ${productName} — ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export interface ShareProductInput {
  name: string;
  slug: string;
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

/** Payload handed to the Web Share API for a single product. */
export function buildSharePayload(product: { name: string; slug: string }): {
  title: string;
  text: string;
  url: string;
} {
  const url = buildProductShareUrl(product.slug);
  return {
    title: product.name,
    text: `${product.name} — find it at our car accessories store.`,
    url,
  };
}
