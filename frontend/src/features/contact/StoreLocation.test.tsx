import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { StoreLocation } from "./StoreLocation";

function renderLocation(shopState = createMockState()) {
  return render(<StoreLocation />, {
    wrapper: ({ children }) => <TestWrapper shopState={shopState}>{children}</TestWrapper>,
  });
}

describe("StoreLocation", () => {
  it("renders the Karimnagar store heading and details", () => {
    renderLocation();
    expect(
      screen.getByRole("heading", { name: /visit us in karimnagar/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(mockShopSettings.address).length).toBeGreaterThan(0);
    expect(screen.getByText(mockShopSettings.business_hours!)).toBeInTheDocument();
    expect(screen.getByText(mockShopSettings.shop_name)).toBeInTheDocument();
  });

  it("links phone, email and directions", () => {
    renderLocation();
    expect(screen.getByRole("link", { name: mockShopSettings.phone })).toHaveAttribute(
      "href",
      `tel:${mockShopSettings.phone}`,
    );
    expect(screen.getByRole("link", { name: mockShopSettings.email! })).toHaveAttribute(
      "href",
      `mailto:${mockShopSettings.email}`,
    );
    expect(screen.getByRole("link", { name: /get directions/i })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
  });

  it("renders nothing when no location detail is configured", () => {
    const { container } = renderLocation(
      createMockState({
        data: {
          ...mockShopSettings,
          address: "",
          phone: "",
          email: null,
          business_hours: null,
          whatsapp_number: "",
        },
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
