import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { QuickContactOptions } from "./QuickContactOptions";

function renderOptions(shopState = createMockState()) {
  return render(<QuickContactOptions />, {
    wrapper: ({ children }) => <TestWrapper shopState={shopState}>{children}</TestWrapper>,
  });
}

describe("QuickContactOptions", () => {
  it("renders an option card for each configured channel", () => {
    renderOptions();
    expect(screen.getByRole("heading", { name: /reach us the way you prefer/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call now/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start chat/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /send email/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get directions/i })).toBeInTheDocument();
  });

  it("links the call option to tel: and the visit card to maps", () => {
    renderOptions();

    expect(screen.getByRole("link", { name: /call now/i })).toHaveAttribute(
      "href",
      `tel:${mockShopSettings.phone}`,
    );
    expect(screen.getByRole("link", { name: /get directions/i })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
    expect(screen.getByRole("link", { name: /start chat/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/"),
    );
  });

  it("only renders the channels that are configured", () => {
    renderOptions(
      createMockState({
        data: { ...mockShopSettings, email: null, address: "" },
      }),
    );
    expect(screen.getByRole("link", { name: /call now/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start chat/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /send email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /get directions/i })).not.toBeInTheDocument();
  });

  it("renders nothing when no channel is configured", () => {
    const { container } = renderOptions(
      createMockState({
        data: { ...mockShopSettings, phone: "", whatsapp_number: "", email: null, address: "" },
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
