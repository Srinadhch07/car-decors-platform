import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { VisitStore } from "./VisitStore";

describe("VisitStore", () => {
  it("renders the location heading and configured details", () => {
    render(<VisitStore />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: /Visit Us in Karimnagar/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(mockShopSettings.address).length).toBeGreaterThan(0);
    expect(screen.getByText(mockShopSettings.business_hours!)).toBeInTheDocument();
    expect(screen.getByText("Chat on WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("links directions to the configured address", () => {
    render(<VisitStore />, { wrapper: TestWrapper });
    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link.getAttribute("href")).toContain(
      encodeURIComponent(mockShopSettings.address),
    );
  });

  it("renders nothing when no store details are configured", () => {
    const { container } = render(<VisitStore />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: {
              ...mockShopSettings,
              address: "",
              business_hours: null,
              phone: "",
              whatsapp_number: "",
              email: null,
              social_links: {},
            },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(container.innerHTML).toBe("");
  });
});
