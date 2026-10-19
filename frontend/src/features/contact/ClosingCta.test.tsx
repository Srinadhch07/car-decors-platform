import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { ClosingCta } from "./ClosingCta";

function renderCta(shopState = createMockState()) {
  return render(<ClosingCta />, {
    wrapper: ({ children }) => <TestWrapper shopState={shopState}>{children}</TestWrapper>,
  });
}

describe("ClosingCta", () => {
  it("renders the closing heading and product CTA", () => {
    renderCta();
    expect(
      screen.getByRole("heading", { name: /your next upgrade starts here\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore products/i })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("prefers WhatsApp when a number is configured", () => {
    renderCta();
    expect(screen.getByRole("link", { name: /whatsapp us/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/"),
    );
  });

  it("falls back to a call link when WhatsApp is unavailable", () => {
    renderCta(createMockState({ data: { ...mockShopSettings, whatsapp_number: "" } }));
    expect(screen.getByRole("link", { name: /call us/i })).toHaveAttribute(
      "href",
      `tel:${mockShopSettings.phone}`,
    );
  });
});
