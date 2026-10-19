import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { OurApproach } from "./OurApproach";

describe("OurApproach", () => {
  it("renders the approach themes as an editorial list", () => {
    render(<OurApproach />, { wrapper: TestWrapper });
    expect(screen.getByText(/How we work/)).toBeInTheDocument();
    for (const title of [
      "Experience",
      "Understanding your car",
      "The right accessories",
      "A personal touch",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });
});
