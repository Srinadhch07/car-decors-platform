import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { EXPERIENCE_YEARS } from "./aboutContent";
import { ExperienceHighlight } from "./ExperienceHighlight";

describe("ExperienceHighlight", () => {
  it("renders the experience milestone", () => {
    render(<ExperienceHighlight />, { wrapper: TestWrapper });
    expect(screen.getByText(String(EXPERIENCE_YEARS))).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Years of Experience" }),
    ).toBeInTheDocument();
  });

  it("renders decorative rings without images", () => {
    const { container } = render(<ExperienceHighlight />, {
      wrapper: TestWrapper,
    });
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("img").length).toBe(0);
  });
});
