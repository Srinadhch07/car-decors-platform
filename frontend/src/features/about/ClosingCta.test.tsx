import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { ClosingCta } from "./ClosingCta";

describe("ClosingCta", () => {
  it("renders the closing call to action with both links", () => {
    render(<ClosingCta />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: /personal touch/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /explore products/i }),
    ).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: /contact us/i })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});
