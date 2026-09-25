import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeoHead } from "./SeoHead";

describe("SeoHead", () => {
  it("applies title, description, canonical and OG tags", () => {
    render(
      <SeoHead
        data={{
          title: "Premium Seat Covers | SLG Car Decors",
          description: "Luxury car seat covers in Hanamkonda, Telangana.",
          canonicalPath: "/products/premium-seat-covers",
          siteName: "SLG Car Decors",
          ogImage: "/images/og-default.png",
        }}
      />,
    );

    const head = document.head;
    expect(document.title).toBe("Premium Seat Covers | SLG Car Decors");
    expect(head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Luxury car seat covers in Hanamkonda, Telangana.",
    );
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
      "https://car-decors.duckdns.org/products/premium-seat-covers",
    );
    expect(head.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(
      "Premium Seat Covers | SLG Car Decors",
    );
    expect(head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(
      "https://car-decors.duckdns.org/images/og-default.png",
    );
    expect(head.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe(
      "summary_large_image",
    );
  });

  it("applies noindex when requested", () => {
    render(<SeoHead data={{ title: "Page Not Found | SLG", noIndex: true }} />);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
      "noindex, nofollow",
    );
  });

  it("renders JSON-LD with script-unsafe characters escaped", () => {
    render(
      <SeoHead
        data={{
          title: "T",
          jsonLd: { "@context": "https://schema.org", "@type": "Organization", name: "</script>" },
        }}
      />,
    );
    const scripts = document.head.querySelectorAll<HTMLScriptElement>('script[data-seo-jsonld]');
    expect(scripts.length).toBe(1);
    expect(scripts[0].textContent).not.toContain("</script>");
    expect(scripts[0].textContent).toContain("\\u003c/script>");
  });

  it("replaces the previous page's tags on data change", () => {
    const { rerender } = render(<SeoHead data={{ title: "First" }} />);
    rerender(
      <SeoHead
        data={{
          title: "Second",
          description: "Fresh description",
          ogImage: "/images/og-default.png",
        }}
      />,
    );
    expect(document.title).toBe("Second");
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Fresh description",
    );
    rerender(<SeoHead data={{ title: "Third" }} />);
    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });
});