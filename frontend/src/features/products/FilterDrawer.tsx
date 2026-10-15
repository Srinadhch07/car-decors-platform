import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FilterDrawer({ open, onClose, children }: FilterDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 md:hidden"
      style={{ visibility: open ? "visible" : "hidden" }}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-dark-950/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Filters"
        className={`absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-floating transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative flex items-center justify-between overflow-hidden border-b border-border-light bg-dark-900 px-4 py-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(50% 120% at 20% 120%, color-mix(in srgb, var(--theme-primary) 22%, transparent), transparent 60%)",
            }}
          />
          <h2 className="relative text-base font-semibold text-white">
            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">
              Refine
            </span>
            Filters
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="relative rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
