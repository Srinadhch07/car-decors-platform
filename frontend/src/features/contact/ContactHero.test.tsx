import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { ContactHero } from "./ContactHero";

function renderHero(shopState = createMockState()) {
  return render(<ContactHero />, {
    wrapper: ({ children }) => <TestWrapper shopState={shopState}>{children}</TestWrapper>,
  });
}

describe("ContactHero", () => {
  it("renders the hero heading and support copy", () => {
    renderHero();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Let's Talk About/);
    expect(heading).toHaveTextContent(/Your Next Drive\./);
    expect(
      screen.getByText(/looking for accessories for your car/i),
    ).toBeInTheDocument();
  });

  it("links the enquiry CTA to the composer and WhatsApp to the configured number", () => {
    renderHero();
    expect(screen.getByRole("link", { name: /send an enquiry/i })).toHaveAttribute(
      "href",
      "#enquiry",
    );
    expect(screen.getByRole("link", { name: /whatsapp us/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me/"),
    );
  });

  it("hides the WhatsApp CTA when no number is configured", () => {
    renderHero(createMockState({ data: { ...mockShopSettings, whatsapp_number: "" } }));
    expect(screen.queryByRole("link", { name: /whatsapp us/i })).not.toBeInTheDocument();
  });
});
