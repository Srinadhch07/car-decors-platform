import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";

describe("Footer", () => {
  it("renders shop name from settings", () => {
    render(<Footer />, { wrapper: TestWrapper });
    expect(screen.getByText(mockShopSettings.shop_name)).toBeInTheDocument();
  });

  it("falls back to default brand when loading", () => {
    render(<Footer />, {
      wrapper: ({ children }) => (
        <TestWrapper shopState={createMockState({ data: null, loading: true })}>
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.getByText("Car Decor")).toBeInTheDocument();
  });

  it("renders quick links", () => {
    render(<Footer />, { wrapper: TestWrapper });
    const quickLinksSection = screen.getByText("Quick Links").closest("div")!;
    const links = within(quickLinksSection).getAllByRole("link");
    const linkTexts = links.map((l) => l.textContent?.trim());
    expect(linkTexts).toContain("Home");
    expect(linkTexts).toContain("Products");
    expect(linkTexts).toContain("About Us");
    expect(linkTexts).toContain("Contact");
  });

  it("renders phone as tel: link", () => {
    render(<Footer />, { wrapper: TestWrapper });
    const phoneLink = screen.getByRole("link", { name: mockShopSettings.phone });
    expect(phoneLink).toHaveAttribute("href", `tel:${mockShopSettings.phone}`);
  });

  it("renders email as mailto: link", () => {
    render(<Footer />, { wrapper: TestWrapper });
    const emailLink = screen.getByRole("link", { name: mockShopSettings.email! });
    expect(emailLink).toHaveAttribute("href", `mailto:${mockShopSettings.email}`);
  });

  it("renders address", () => {
    render(<Footer />, { wrapper: TestWrapper });
    expect(screen.getByText(mockShopSettings.address)).toBeInTheDocument();
  });

  it("renders business hours", () => {
    render(<Footer />, { wrapper: TestWrapper });
    expect(screen.getByText(mockShopSettings.business_hours!)).toBeInTheDocument();
  });

  it("renders social links", () => {
    render(<Footer />, { wrapper: TestWrapper });
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "href",
      mockShopSettings.social_links.instagram,
    );
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      mockShopSettings.social_links.facebook,
    );
  });

  it("hides social links section when social_links is empty", () => {
    render(<Footer />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({ data: { ...mockShopSettings, social_links: {} } })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Follow Us")).not.toBeInTheDocument();
  });

  it("hides contact section when all contact fields are empty", () => {
    render(<Footer />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: {
              ...mockShopSettings,
              phone: "",
              email: null,
              address: "",
            },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Contact Us")).not.toBeInTheDocument();
  });

  it("hides business hours when null", () => {
    render(<Footer />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({
            data: { ...mockShopSettings, business_hours: null },
          })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByText("Business Hours")).not.toBeInTheDocument();
  });

  it("renders copyright with shop name", () => {
    render(<Footer />, { wrapper: TestWrapper });
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${year}.*${mockShopSettings.shop_name}`)),
    ).toBeInTheDocument();
  });

  it("renders the creator signature", () => {
    render(<Footer />, { wrapper: TestWrapper });
    expect(screen.getByText("A Thridha Labs creation.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Srinadh Chintakindi" })).toHaveAttribute(
      "href",
      "https://srinadhch07.vercel.app/",
    );
  });

  it("hides WhatsApp in Follow Us when whatsapp_number is empty", () => {
    render(<Footer />, {
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
    const followSection = screen.queryByText("Follow Us");
    if (followSection) {
      expect(screen.queryByText("WhatsApp")).not.toBeInTheDocument();
    }
  });
});
