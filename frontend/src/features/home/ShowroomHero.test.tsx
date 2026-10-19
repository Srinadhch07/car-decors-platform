import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { FALLBACK_BRAND } from "../../lib/seo";
import { ShowroomHero } from "./ShowroomHero";

describe("ShowroomHero", () => {
  it("renders the business name from shop settings as the headline", () => {
    render(<ShowroomHero />, { wrapper: TestWrapper });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(mockShopSettings.shop_name);
  });

  it("falls back to the default brand when settings are unavailable", () => {
    render(<ShowroomHero />, {
      wrapper: ({ children }) => (
        <TestWrapper shopState={createMockState({ data: null, loading: false })}>
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(FALLBACK_BRAND);
  });

  it("renders the animated decorative layer as aria-hidden", () => {
    const { container } = render(<ShowroomHero />, { wrapper: TestWrapper });
    const decor = container.querySelector("[data-hero-decor]");
    expect(decor).not.toBeNull();
    expect(decor).toHaveAttribute("aria-hidden", "true");
  });

  it("links the primary CTA to the products page", () => {
    render(<ShowroomHero />, { wrapper: TestWrapper });
    expect(screen.getByRole("link", { name: /explore products/i })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("links the secondary CTA to the contact page", () => {
    render(<ShowroomHero />, { wrapper: TestWrapper });
    expect(screen.getByRole("link", { name: /contact us/i })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("does not render product search on the homepage hero", () => {
    render(<ShowroomHero />, { wrapper: TestWrapper });
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
