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
        className={`absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-elevated transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <h2 className="text-base font-semibold text-text-primary">Filters</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-text-secondary hover:bg-surface-muted"
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
