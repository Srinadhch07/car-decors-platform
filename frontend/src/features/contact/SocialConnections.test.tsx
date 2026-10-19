import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper, createMockState } from "../../test-utils";
import { SocialConnections } from "./SocialConnections";

function renderSocial(shopState = createMockState()) {
  return render(<SocialConnections />, {
    wrapper: ({ children }) => <TestWrapper shopState={shopState}>{children}</TestWrapper>,
  });
}

describe("SocialConnections", () => {
  it("renders the configured social links", () => {
    renderSocial();
    const instagram = screen.getByRole("link", { name: /instagram/i });
    expect(instagram).toHaveAttribute("href", "https://instagram.com/vrcardecors");
    expect(instagram).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
      "href",
      "https://facebook.com/vrcardecors",
    );
  });

  it("ignores blank or non-URL social values", () => {
    const { container } = renderSocial(
      createMockState({
        data: {
          ...createMockState().data!,
          social_links: { instagram: "  ", facebook: "not-a-url" },
        },
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no social links are configured", () => {
    const { container } = renderSocial(
      createMockState({
        data: { ...createMockState().data!, social_links: {} },
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
