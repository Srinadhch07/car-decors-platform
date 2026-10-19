import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestWrapper, createMockState, mockShopSettings } from "../../test-utils";
import { EnquiryComposer } from "./EnquiryComposer";

function renderComposer(shopState = createMockState()) {
  return render(<EnquiryComposer />, {
    wrapper: ({ children }) => <TestWrapper shopState={shopState}>{children}</TestWrapper>,
  });
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Ravi Kumar" } });
  fireEvent.change(screen.getByLabelText(/phone or email/i), {
    target: { value: "+91 98765 43210" },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { value: "Do you have floor mats for a Swift?" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EnquiryComposer", () => {
  it("renders the enquiry fields and channel buttons", () => {
    renderComposer();
    expect(screen.getByRole("heading", { name: /send us an enquiry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send on whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send via email/i })).toBeInTheDocument();
  });

  it("shows validation errors and blocks the handoff when empty", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderComposer();

    fireEvent.click(screen.getByRole("button", { name: /send on whatsapp/i }));

    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(3);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone/email value", () => {
    renderComposer();
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Ravi" } });
    fireEvent.change(screen.getByLabelText(/phone or email/i), { target: { value: "nope" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Hello" } });

    fireEvent.click(screen.getByRole("button", { name: /send on whatsapp/i }));

    expect(
      screen.getByText(/enter a valid phone number or email address/i),
    ).toBeInTheDocument();
  });

  it("opens WhatsApp with a composed message and an honest status", () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderComposer();

    fillValidForm();
    fireEvent.change(screen.getByLabelText(/enquiry type/i), {
      target: { value: "Price enquiry" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send on whatsapp/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("wa.me/");
    const message = decodeURIComponent(url.split("text=")[1]);
    expect(message).toContain("Ravi Kumar");
    expect(message).toContain("Subject: Price enquiry");

    expect(screen.getByRole("status")).toHaveTextContent(/opening whatsapp/i);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/press send there/i);

    vi.useRealTimers();
  });

  it("disables the buttons while the handoff is opening", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "open").mockImplementation(() => null);
    renderComposer();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /send on whatsapp/i }));
    expect(screen.getByRole("button", { name: /send on whatsapp/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: /send on whatsapp/i })).toBeEnabled();

    vi.useRealTimers();
  });

  it("falls back to a call prompt when no message channel is configured", () => {
    renderComposer(
      createMockState({
        data: { ...mockShopSettings, whatsapp_number: "", email: null },
      }),
    );
    expect(screen.getByText(/call us to enquire/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send on whatsapp/i })).not.toBeInTheDocument();
  });

  it("renders nothing when no contact channel exists at all", () => {
    const { container } = renderComposer(
      createMockState({
        data: { ...mockShopSettings, whatsapp_number: "", email: null, phone: "" },
      }),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
