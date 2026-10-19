import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, mockShopSettings } from "../../test-utils";
import { HomeAboutSection } from "./HomeAboutSection";

describe("HomeAboutSection", () => {
  it("renders the section heading", () => {
    render(<HomeAboutSection />, { wrapper: TestWrapper });
    expect(screen.getByText("About the Shop")).toBeInTheDocument();
    expect(screen.getByText("Personalise and protect your car")).toBeInTheDocument();
  });

  it("uses the shop name from settings", () => {
    render(<HomeAboutSection />, { wrapper: TestWrapper });
    expect(
      screen.getByText(new RegExp(`${mockShopSettings.shop_name} is a car accessories`)),
    ).toBeInTheDocument();
  });

  it("renders highlights and a link to the about page", () => {
    render(<HomeAboutSection />, { wrapper: TestWrapper });
    expect(screen.getByText("Handpicked Range")).toBeInTheDocument();
    expect(screen.getByText("Quality You Can Trust")).toBeInTheDocument();
    expect(screen.getByText("Here to Help")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /learn more about us/i })).toHaveAttribute(
      "href",
      "/about",
    );
  });
});
