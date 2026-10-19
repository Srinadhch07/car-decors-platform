import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { VisitUsSection } from "./VisitUsSection";

describe("VisitUsSection", () => {
  it("renders visit heading and address from settings", () => {
    render(<VisitUsSection />, { wrapper: TestWrapper });
    expect(screen.getByText("Come See Us in Person")).toBeInTheDocument();
    expect(screen.getByText(mockShopSettings.address)).toBeInTheDocument();
    expect(screen.getByText(mockShopSettings.business_hours!)).toBeInTheDocument();
  });

  it("renders contact actions from settings", () => {
    render(<VisitUsSection />, { wrapper: TestWrapper });
    expect(screen.getByText("Chat on WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Call Us")).toBeInTheDocument();
    expect(screen.getByText("Email Us")).toBeInTheDocument();
  });

  it("links directions to the configured address", () => {
    render(<VisitUsSection />, { wrapper: TestWrapper });
    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link.getAttribute("href")).toContain(encodeURIComponent(mockShopSettings.address));
  });

  it("renders nothing when no contact info is configured", () => {
    const { container } = render(<VisitUsSection />, {
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
