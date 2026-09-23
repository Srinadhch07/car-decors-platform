import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { THRIDHA_SIGNATURE_LINKS, ThridhaSignature } from "./ThridhaSignature";

const makeMediaQuery = (matches: boolean) =>
  ({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

const stubReducedMotion = () => {
  const original = window.matchMedia;
  window.matchMedia = (() => makeMediaQuery(true)) as typeof window.matchMedia;
  return () => {
    if (original) window.matchMedia = original;
    else delete (window as unknown as Record<string, unknown>)["matchMedia"];
  };
};

describe("ThridhaSignature", () => {
  it("renders the signature text lines", () => {
    render(<ThridhaSignature />);
    expect(screen.getByText("A Thridha Labs creation.")).toBeInTheDocument();
    expect(screen.getByText("Srinadh Chintakindi")).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it("renders fully visible in test environments", () => {
    const { container } = render(<ThridhaSignature />);
    expect(container.firstElementChild).toHaveStyle("opacity: 1");
  });

  it("links Portfolio to the personal portfolio", () => {
    render(<ThridhaSignature />);
    const link = screen.getByRole("link", { name: "Portfolio" });
    expect(link).toHaveAttribute("href", THRIDHA_SIGNATURE_LINKS.portfolio);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links personal LinkedIn to the right profile", () => {
    render(<ThridhaSignature />);
    const link = screen.getByRole("link", { name: "LinkedIn" });
    expect(link).toHaveAttribute("href", THRIDHA_SIGNATURE_LINKS.linkedin);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links Thridha Labs to the company page", () => {
    render(<ThridhaSignature />);
    const link = screen.getByRole("link", { name: "Thridha Labs" });
    expect(link).toHaveAttribute("href", THRIDHA_SIGNATURE_LINKS.thridha);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links the creator name to the portfolio", () => {
    render(<ThridhaSignature />);
    const link = screen.getByRole("link", { name: "Srinadh Chintakindi" });
    expect(link).toHaveAttribute("href", THRIDHA_SIGNATURE_LINKS.portfolio);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps content fully visible when reduced motion is enabled", () => {
    const restore = stubReducedMotion();
    try {
      const { container } = render(<ThridhaSignature />);
      expect(container.firstElementChild).toHaveStyle("opacity: 1");
      expect(screen.getByText("A Thridha Labs creation.")).toBeInTheDocument();
      expect(screen.getByText("Srinadh Chintakindi")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("admin variant is compact and omits the secondary link row", () => {
    render(<ThridhaSignature variant="admin" />);
    expect(screen.getByText("A Thridha Labs creation.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Portfolio" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LinkedIn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Thridha Labs" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Srinadh Chintakindi" })).toHaveAttribute(
      "href",
      THRIDHA_SIGNATURE_LINKS.portfolio,
    );
  });
});