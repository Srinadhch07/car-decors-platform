import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { TestWrapper, mockShopSettings } from "../test-utils";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";

const server = setupServer(
  http.get("*/api/shop", () => HttpResponse.json(mockShopSettings)),
  http.get("*/api/categories", () => HttpResponse.json([])),
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
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/17 Years of/);
    expect(
      screen.getByRole("heading", { name: /Visit Us in Karimnagar/i }),
    ).toBeInTheDocument();
  });

  it("links to products browse CTA", () => {
    render(<AboutPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/about"]}>{children}</TestWrapper>
      ),
    });
    expect(
      screen.getAllByRole("link", { name: /explore products/i })[0],
    ).toHaveAttribute("href", "/products");
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
  it("renders the Contact hero heading", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(/Let's Talk About/);
    expect(heading).toHaveTextContent(/Your Next Drive\./);
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

  it("renders WhatsApp links with the configured number", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    const whatsappLinks = screen.getAllByRole("link", { name: /whatsapp/i });
    expect(
      whatsappLinks.some(
        (link) =>
          link.getAttribute("href")?.includes("wa.me/") &&
          link
            .getAttribute("href")
            ?.includes(mockShopSettings.whatsapp_number.replace(/[^0-9+]/g, "")),
      ),
    ).toBe(true);
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
    expect(screen.getAllByText(mockShopSettings.address).length).toBeGreaterThan(0);
    expect(screen.getByText(mockShopSettings.business_hours!)).toBeInTheDocument();
  });

  it("renders the enquiry composer and store section", () => {
    render(<ContactPage />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/contact"]}>{children}</TestWrapper>
      ),
    });
    expect(
      screen.getByRole("heading", { name: /Visit Us in Karimnagar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send on whatsapp/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Your Next Upgrade Starts Here\./i }),
    ).toBeInTheDocument();
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