import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { EXPERIENCE_YEARS } from "./aboutContent";
import { OurStory } from "./OurStory";

describe("OurStory", () => {
  it("renders the story heading and body", () => {
    render(<OurStory />, { wrapper: TestWrapper });
    expect(screen.getByText(/A story shaped by/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Over ${EXPERIENCE_YEARS} years`)),
    ).toBeInTheDocument();
  });

  it("exposes the story anchor target", () => {
    const { container } = render(<OurStory />, { wrapper: TestWrapper });
    expect(container.querySelector("#our-story")).not.toBeNull();
  });

  it("includes a pull quote", () => {
    render(<OurStory />, { wrapper: TestWrapper });
    expect(
      screen.getByText(/A car should feel like yours/),
    ).toBeInTheDocument();
  });
});
