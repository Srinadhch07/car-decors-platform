import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { AboutSection } from "./AboutSection";

describe("AboutSection", () => {
  it("renders shop name in heading", () => {
    render(<AboutSection />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByRole("heading", { name: /SLG Car Decors/ })).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<AboutSection />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByText("Quality Products")).toBeInTheDocument();
    expect(screen.getByText("Expert Service")).toBeInTheDocument();
    expect(screen.getByText("Quick Installation")).toBeInTheDocument();
    expect(screen.getByText("Customer First")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<AboutSection />, {
      wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
    });
    expect(screen.getByText(/trusted car accessories/)).toBeInTheDocument();
  });
});
