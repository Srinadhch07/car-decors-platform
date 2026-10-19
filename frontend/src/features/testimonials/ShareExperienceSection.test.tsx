import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { ShareExperienceSection } from "./ShareExperienceSection";

function renderShare() {
  return render(<ShareExperienceSection />, { wrapper: TestWrapper });
}

describe("ShareExperienceSection", () => {
  it("renders the CTA heading and the submission form", () => {
    renderShare();
    expect(
      screen.getByRole("heading", { name: "Had an Experience with Us?" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Your testimonial")).toBeInTheDocument();
  });

  it("exposes the anchor target for the hero CTA", () => {
    renderShare();
    expect(document.getElementById("share-your-experience")).not.toBeNull();
  });

  it("keeps the consent requirement visible", () => {
    renderShare();
    expect(
      screen.getByLabelText(/i consent to this testimonial being displayed publicly/i),
    ).toBeInTheDocument();
  });
});
