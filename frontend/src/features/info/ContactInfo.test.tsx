import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { ContactInfo } from "./ContactInfo";

describe("ContactInfo", () => {
  it("renders shop name", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByText(mockShopSettings.shop_name)).toBeInTheDocument();
  });

  it("renders shop address", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByText("123 Main Street, Chennai")).toBeInTheDocument();
  });

  it("renders shop phone as a link", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    const phone = screen.getByRole("link", { name: "+919876543210" });
    expect(phone).toHaveAttribute("href", "tel:+919876543210");
  });

  it("renders shop email as a link", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    const email = screen.getByRole("link", { name: "contact@slg.com" });
    expect(email).toHaveAttribute("href", "mailto:contact@slg.com");
  });

  it("renders business hours", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByText("Mon-Sat: 9AM-8PM")).toBeInTheDocument();
  });

  it("renders WhatsApp start chat button using configured number", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    const whatsapp = screen.getByRole("link", { name: /start chat/i });
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("href", expect.stringContaining("wa.me/"));
    expect(whatsapp.getAttribute("href")).toContain(
      mockShopSettings.whatsapp_number.replace(/[^0-9+]/g, ""),
    );
  });

  it("renders social links when configured", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "href",
      mockShopSettings.social_links.instagram,
    );
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      mockShopSettings.social_links.facebook,
    );
  });

  it("renders Get in Touch heading", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByRole("heading", { name: "Get in Touch" })).toBeInTheDocument();
  });

  it("renders Chat on WhatsApp heading", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByRole("heading", { name: "Chat on WhatsApp" })).toBeInTheDocument();
  });

  it("does not render phone when unavailable", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, phone: "" },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
  });

  it("does not render WhatsApp CTA when whatsapp unavailable", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, whatsapp_number: "" },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByRole("link", { name: /start chat/i })).not.toBeInTheDocument();
  });

  it("does not render email when unavailable", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, email: null },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
  });

  it("does not render social links when none configured", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, social_links: {} },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Follow Us")).not.toBeInTheDocument();
  });

  it("does not render broken placeholders when all optional fields empty", () => {
    render(<ContactInfo />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: {
              ...mockShopSettings,
              phone: "",
              whatsapp_number: "",
              email: null,
              address: "",
              business_hours: null,
              social_links: {},
            },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(mockShopSettings.shop_name)).toBeInTheDocument();
  });

  it("is responsive-safe (two-column grid on md+)", () => {
    const { container } = render(<ContactInfo />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("md:grid-cols-2");
  });
});