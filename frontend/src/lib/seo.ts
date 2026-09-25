/**
 * Lightweight, dependency-free <head> management for the client-rendered SPA.
 *
 * The site is a single-page app, so crawlers that do not execute JavaScript
 * only see the static fallback tags in index.html. For everyone else these
 * helpers keep the current document's metadata in sync with the rendered page
 * (title, description, canonical, robots, Open Graph, Twitter Card and
 * structured data). Every public page calls them through <SeoHead />.
 */

/** Production storefront origin (also used as the sitemap host). */
export const SITE_URL = "https://car-decors.duckdns.org";

/** Fallback brand used until the shop settings provide the real one. */
export const FALLBACK_BRAND = "SLG Car Decors";

/** Default social-share image used when a page has no product/category image. */
export const DEFAULT_OG_IMAGE = "/images/og-default.png";

const JSON_LD_ATTR = "data-seo-jsonld";

export interface SeoData {
  /** Unique ``<title>`` for the current page. */
  title: string;
  /** Unique meta description (Google ignores it above ~160 chars). */
  description?: string;
  /**
   * Self path for the canonical link, e.g. "/products/example" or "/".
   * Query strings are intentionally dropped (via window.location.pathname).
   */
  canonicalPath?: string;
  /** Explicit robots value; defaults to "noindex, nofollow" when noIndex is set. */
  robots?: string;
  /** When true the page must not be indexed (404s, admin, auth screens). */
  noIndex?: boolean;
  /** Open Graph / Twitter image; absolute or site-relative path. */
  ogImage?: string;
  ogType?: "website" | "product" | "article";
  /** Business name used in og:site_name. */
  siteName?: string;
  /** Structured data graph for the page (each object becomes a <script type="application/ld+json">). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/** Resolve a site-relative path (or absolute URL) to a full URL. */
export function absoluteUrl(pathOrUrl: string | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function setMeta(attr: "name" | "property", key: string, content?: string): void {
  const selector = `${attr === "name" ? 'meta[name="' : 'meta[property="'}${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute(attr, key);
    existing.setAttribute("content", content);
  } else {
    const meta = document.createElement("meta");
    meta.setAttribute(attr, key);
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  }
}

function setCanonical(href?: string): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute("href", href);
  } else {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", href);
    document.head.appendChild(link);
  }
}

function renderJsonLd(items: readonly Record<string, unknown>[]): void {
  document.head
    .querySelectorAll<HTMLScriptElement>(`script[${JSON_LD_ATTR}]`)
    .forEach((node) => node.remove());
  for (const item of items) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(JSON_LD_ATTR, "true");
    // < and friends must never break out of the JSON blob inside a script tag.
    script.text = JSON.stringify(item).replace(/</g, "\\u003c");
    document.head.appendChild(script);
  }
}

/** Apply the full metadata set for the current page to <head>. */
export function applySeo(data: SeoData): void {
  document.title = data.title;

  setMeta("name", "description", data.description);
  setCanonical(absoluteUrl(data.canonicalPath));
  setMeta("name", "robots", data.noIndex ? "noindex, nofollow" : data.robots);

  const image = absoluteUrl(data.ogImage);
  const canonical = absoluteUrl(data.canonicalPath);

  setMeta("property", "og:title", data.title);
  setMeta("property", "og:description", data.description);
  setMeta("property", "og:type", data.ogType ?? "website");
  setMeta("property", "og:url", canonical);
  setMeta("property", "og:site_name", data.siteName ?? FALLBACK_BRAND);
  setMeta("property", "og:image", image);

  setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  setMeta("name", "twitter:title", data.title);
  setMeta("name", "twitter:description", data.description);
  setMeta("name", "twitter:image", image);

  const graph = data.jsonLd ? (Array.isArray(data.jsonLd) ? data.jsonLd : [data.jsonLd]) : [];
  renderJsonLd(graph);
}

/** Build a BreadcrumbList JSON-LD graph from ordered (name, path) pairs. */
export function buildBreadcrumbs(
  basePath: string,
  crumbs: readonly { name: string; path?: string }[],
): Record<string, unknown> {
  const items = crumbs.flatMap((crumb, index) => {
    if (!crumb.path) return [];
    return [
      {
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: basePath + crumb.path,
      },
    ];
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

const SOCIAL_HOST_RE = /(^|\.)(instagram|facebook|youtube|twitter|x|linkedin|tiktok)\./i;

/** Return the social profile URLs from shop settings that are linkable. */
export function socialProfileUrls(
  links: Record<string, string> | undefined,
): string[] {
  if (!links) return [];
  return Object.values(links)
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value) && SOCIAL_HOST_RE.test(value));
}

/** Map a product availability value to its schema.org Offer availability. */
export function availabilitySchemaValue(status: string): string {
  switch (status) {
    case "IN_STOCK":
      return "https://schema.org/InStock";
    case "ON_ORDER":
      return "https://schema.org/BackOrder";
    default:
      return "https://schema.org/OutOfStock";
  }
}

const OG_PROPERTIES = [
  "og:title",
  "og:description",
  "og:type",
  "og:url",
  "og:site_name",
  "og:image",
] as const;

const TWITTER_NAMES = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
] as const;

/**
 * Block search indexing and clear page-owned tags for non-public screens
 * (admin console, login, password reset, 404s). Used before a page with no
 * SEO data of its own renders.
 */
export function blockIndexing(): void {
  setCanonical(undefined);
  setMeta("name", "description", undefined);
  setMeta("name", "robots", "noindex, nofollow");
  for (const key of OG_PROPERTIES) setMeta("property", key, undefined);
  for (const key of TWITTER_NAMES) setMeta("name", key, undefined);
  renderJsonLd([]);
}