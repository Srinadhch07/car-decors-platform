import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { EXPERIENCE_YEARS } from "./aboutContent";
import { AboutHero } from "./AboutHero";

describe("AboutHero", () => {
  it("renders the experience headline and brand copy", () => {
    render(<AboutHero />, { wrapper: TestWrapper });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(`${EXPERIENCE_YEARS} Years of`);
    expect(heading).toHaveTextContent("Passion for Cars.");
    expect(
      screen.getByText(new RegExp(`${EXPERIENCE_YEARS} years around cars`)).tagName,
    ).toBe("P");
  });

  it("shows the location and experience eyebrow", () => {
    render(<AboutHero />, { wrapper: TestWrapper });
    expect(
      screen.getByText(/Karimnagar, Telangana, India · 17 Years/),
    ).toBeInTheDocument();
  });

  it("links to the story section and the products page", () => {
    render(<AboutHero />, { wrapper: TestWrapper });
    expect(screen.getByRole("link", { name: /our story/i })).toHaveAttribute(
      "href",
      "#our-story",
    );
    expect(screen.getByRole("link", { name: /explore products/i })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});
