import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Header } from "./Header";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";

describe("Header", () => {
  it("renders navigation links", () => {
    render(<Header />, { wrapper: TestWrapper });
    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(within(nav).getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /contact/i })).toBeInTheDocument();
  });

  it("renders shop name from settings", () => {
    render(<Header />, { wrapper: TestWrapper });
    expect(screen.getAllByText(mockShopSettings.shop_name).length).toBeGreaterThan(0);
  });

  it("falls back to default brand when loading", () => {
    render(<Header />, {
      wrapper: ({ children }) => (
        <TestWrapper shopState={createMockState({ data: null, loading: true })}>
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.getAllByText("Car Decor").length).toBeGreaterThan(0);
  });

  it("highlights active route", () => {
    render(<Header />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/products"]}>{children}</TestWrapper>
      ),
    });
    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    const productsLink = within(nav).getByRole("link", { name: /products/i });
    expect(productsLink).toHaveAttribute("aria-current", "page");
  });

  it("opens and closes mobile menu", async () => {
    const user = userEvent.setup();
    render(<Header />, { wrapper: TestWrapper });

    const menuButton = screen.getByRole("button", { name: /open menu/i });
    await user.click(menuButton);

    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile navigation")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.queryByLabelText("Mobile navigation")).not.toBeVisible();
  });

  it("closes mobile menu after navigation", async () => {
    const user = userEvent.setup();
    render(<Header />, {
      wrapper: ({ children }) => (
        <TestWrapper initialEntries={["/"]}>{children}</TestWrapper>
      ),
    });

    await user.click(screen.getByRole("button", { name: /open menu/i }));
    const mobileNav = screen.getByLabelText("Mobile navigation");
    expect(mobileNav).toBeVisible();

    const mobileAboutLink = within(mobileNav).getByRole("link", { name: /^about$/i });
    await user.click(mobileAboutLink);

    expect(screen.queryByLabelText("Mobile navigation")).not.toBeVisible();
  });

  it("shows phone link when phone exists", () => {
    render(<Header />, { wrapper: TestWrapper });
    expect(screen.getByLabelText(`Call ${mockShopSettings.phone}`)).toHaveAttribute(
      "href",
      `tel:${mockShopSettings.phone}`,
    );
  });

  it("hides phone link when phone is empty", () => {
    render(<Header />, {
      wrapper: ({ children }) => (
        <TestWrapper
          shopState={createMockState({ data: { ...mockShopSettings, phone: "" } })}
        >
          {children}
        </TestWrapper>
      ),
    });
    expect(screen.queryByRole("link", { name: /call/i })).not.toBeInTheDocument();
  });

  it("shows WhatsApp link when whatsapp_number exists", () => {
    render(<Header />, { wrapper: TestWrapper });
    expect(screen.getByLabelText(/chat on whatsapp/i)).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
  });

  it("hides WhatsApp link when whatsapp_number is empty", () => {
    render(<Header />, {
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
    expect(screen.queryByLabelText(/chat on whatsapp/i)).not.toBeInTheDocument();
  });

  it("mobile menu button has correct aria attributes", async () => {
    const user = userEvent.setup();
    render(<Header />, { wrapper: TestWrapper });

    const button = screen.getByRole("button", { name: /open menu/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "mobile-nav");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
