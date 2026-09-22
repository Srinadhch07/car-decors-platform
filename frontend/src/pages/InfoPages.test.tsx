import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { TestWrapper, mockShopSettings } from "../test-utils";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";

const server = setupServer(
  http.get("*/api/shop", () => HttpResponse.json(mockShopSettings)),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AboutPage", () => {
  it("renders About content", () => {
    render(<AboutPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/about"]}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByRole("heading", { name: /about slg car decors/i })).toBeInTheDocument();
    expect(screen.getByText("Quality Products")).toBeInTheDocument();
  });

  it("links to products browse CTA", () => {
    render(<AboutPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/about"]}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByRole("link", { name: /browse our products/i })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("sets SEO title with shop name", () => {
    render(<AboutPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/about"]}>{children}</TestWrapper>
      ),
    });
    expect(document.title).toContain(`About | ${mockShopSettings.shop_name}`);
  });
});

describe("ContactPage", () => {
  it("renders Contact content", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByRole("heading", { name: "Contact Us" })).toBeInTheDocument();
    expect(screen.getByText("Get in Touch")).toBeInTheDocument();
  });

  it("renders shop name from settings", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    expect(screen.getAllByText(mockShopSettings.shop_name).length).toBeGreaterThan(0);
  });

  it("renders phone tel: link", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    const phone = screen.getByRole("link", { name: mockShopSettings.phone });
    expect(phone).toHaveAttribute("href", `tel:${mockShopSettings.phone}`);
  });

  it("renders WhatsApp link with configured number", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    const whatsapp = screen.getByRole("link", { name: /start chat/i });
    expect(whatsapp.getAttribute("href")).toContain("wa.me/");
    expect(whatsapp.getAttribute("href")).toContain(
      mockShopSettings.whatsapp_number.replace(/[^0-9+]/g, ""),
    );
  });

  it("renders email mailto: link", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    const email = screen.getByRole("link", { name: mockShopSettings.email! });
    expect(email).toHaveAttribute("href", `mailto:${mockShopSettings.email}`);
  });

  it("renders address and business hours", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    expect(screen.getByText(mockShopSettings.address)).toBeInTheDocument();
    expect(screen.getByText(mockShopSettings.business_hours!)).toBeInTheDocument();
  });

  it("sets SEO title with shop name", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    expect(document.title).toContain(`Contact | ${mockShopSettings.shop_name}`);
  });
});