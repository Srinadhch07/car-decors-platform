import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Share2, TriangleAlert } from "lucide-react";
import { buildProductShareUrl, buildWhatsAppShareUrl } from "./shareProduct";

interface ProductShareButtonProps {
  /** Product name, used in accessible labels and the share payload. */
  name: string;
  /** Product slug, used to build the individual product-detail URL. */
  slug: string;
}

type Status = { kind: "success" | "error"; message: string } | null;

const TRIGGER_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-dark-950/70 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-dark-950/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500";

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-orange-600 focus-visible:bg-surface-muted focus-visible:text-orange-600";

/**
 * Per-product share control. Prefers the native Web Share sheet, falls back to
 * copying the product-detail link, and always offers a WhatsApp share that
 * carries the individual product URL.
 *
 * Rendered as a sibling of the card link (never nested inside it) so clicking
 * share can never open the product page.
 */
export function ProductShareButton({ name, slug }: ProductShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const url = buildProductShareUrl(slug);
  const whatsappUrl = buildWhatsAppShareUrl(name, url);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Auto-dismiss the transient status message.
  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2800);
    return () => window.clearTimeout(timer);
  }, [status]);

  const stop = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const copyLink = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(url);
      setStatus({ kind: "success", message: "Link copied to clipboard" });
    } catch {
      setStatus({
        kind: "error",
        message: "Couldn't copy the link. Please copy it from the address bar.",
      });
    }
  }, [url]);

  const handleShare = useCallback(async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: name, text: `${name} — car accessory`, url });
      setStatus({ kind: "success", message: "Thanks for sharing!" });
    } catch (error) {
      // A user cancelling the native sheet is not an error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  }, [name, url, copyLink]);

  return (
    <div ref={wrapRef} className="relative" onClick={stop}>
      <button
        type="button"
        onClick={(event) => {
          stop(event);
          setOpen((value) => !value);
        }}
        className={TRIGGER_CLASS}
        aria-label={`Share ${name}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="group"
          aria-label={`Share ${name}`}
          className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-border-light bg-surface p-1.5 shadow-floating"
        >
          {canNativeShare && (
            <button
              type="button"
              onClick={(event) => {
                stop(event);
                void handleShare();
                setOpen(false);
              }}
              className={ITEM_CLASS}
            >
              <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Share…
            </button>
          )}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            className={ITEM_CLASS}
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={(event) => {
              stop(event);
              void copyLink();
              setOpen(false);
            }}
            className={ITEM_CLASS}
          >
            <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
            Copy link
          </button>
        </div>
      )}

      {status && (
        <span
          role="status"
          className={`absolute right-0 top-full z-30 mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-floating ${
            status.kind === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.kind === "success" ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {status.message}
        </span>
      )}
    </div>
  );
}
