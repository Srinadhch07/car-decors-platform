import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import { OWNER_NAME, OWNER_ROLE } from "./aboutContent";
import { MeetTheOwner } from "./MeetTheOwner";

describe("MeetTheOwner", () => {
  it("introduces the owner and role", () => {
    render(<MeetTheOwner />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: new RegExp(OWNER_NAME) }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${OWNER_NAME} · ${OWNER_ROLE}`)),
    ).toBeInTheDocument();
  });

  it("renders no photo placeholder or monogram", () => {
    const { container } = render(<MeetTheOwner />, { wrapper: TestWrapper });
    expect(container.querySelectorAll("img").length).toBe(0);
    expect(screen.queryByText("CAK")).not.toBeInTheDocument();
  });
});
