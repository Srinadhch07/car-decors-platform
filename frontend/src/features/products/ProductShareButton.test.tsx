import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductShareButton } from "./ProductShareButton";
import { buildWhatsAppShareUrl, buildProductShareUrl } from "./shareProduct";

const PRODUCT = { name: "Leather Seat Cover", slug: "leather-seat-cover" };

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

function setNativeShare(share: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
}

afterEach(() => {
  setNativeShare(undefined);
  Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "clipboard");
  vi.restoreAllMocks();
});

describe("ProductShareButton", () => {
  it("exposes an accessible share label for the product", () => {
    render(<ProductShareButton {...PRODUCT} />);
    expect(
      screen.getByRole("button", { name: /share leather seat cover/i }),
    ).toBeInTheDocument();
  });

  it("offers WhatsApp and Copy link when opened", async () => {
    const user = userEvent.setup();
    render(<ProductShareButton {...PRODUCT} />);
    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));
    expect(screen.getByRole("link", { name: /whatsapp/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });

  it("copies the individual product URL as a fallback", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    setNativeShare(undefined);

    render(<ProductShareButton {...PRODUCT} />);
    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));
    await user.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(buildProductShareUrl(PRODUCT.slug));
    expect(await screen.findByText(/link copied to clipboard/i)).toBeInTheDocument();
  });

  it("shows a helpful message when copying fails", async () => {
    const user = userEvent.setup();
    setClipboard(vi.fn().mockRejectedValue(new Error("denied")));

    render(<ProductShareButton {...PRODUCT} />);
    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));
    await user.click(screen.getByRole("button", { name: /copy link/i }));

    expect(await screen.findByText(/couldn't copy the link/i)).toBeInTheDocument();
  });

  it("uses the native share sheet when available", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setNativeShare(share);

    render(<ProductShareButton {...PRODUCT} />);
    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));
    await user.click(screen.getByRole("button", { name: /^share…$/i }));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toMatchObject({
      url: buildProductShareUrl(PRODUCT.slug),
      title: PRODUCT.name,
    });
  });

  it("treats a cancelled native share as a non-error", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    setNativeShare(() => Promise.reject(new DOMException("cancelled", "AbortError")));

    render(<ProductShareButton {...PRODUCT} />);
    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));
    await user.click(screen.getByRole("button", { name: /share…/i }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("builds the WhatsApp link with the individual product URL", async () => {
    const user = userEvent.setup();
    render(<ProductShareButton {...PRODUCT} />);
    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));

    const link = screen.getByRole("link", { name: /whatsapp/i });
    expect(link).toHaveAttribute(
      "href",
      buildWhatsAppShareUrl(PRODUCT.name, buildProductShareUrl(PRODUCT.slug)),
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not propagate clicks to a surrounding card link", async () => {
    const user = userEvent.setup();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ProductShareButton {...PRODUCT} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /share leather seat cover/i }));
    expect(parentClick).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument(),
    );
  });
});
