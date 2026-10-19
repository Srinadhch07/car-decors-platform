import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "../../types/api";

interface GalleryLightboxProps {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function caption(item: GalleryItem): string {
  return item.description || item.title;
}

export function GalleryLightbox({ items, index, onClose, onIndexChange }: GalleryLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];

  const goTo = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const wrapped = (next + items.length) % items.length;
      onIndexChange(wrapped);
    },
    [items.length, onIndexChange],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        goTo(index - 1);
      } else if (event.key === "ArrowRight") {
        goTo(index + 1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [goTo, onClose]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} — media viewer`}
      className="fixed inset-0 z-[60] flex flex-col bg-dark-950/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white/90">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous item"
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-dark-950/60 text-white transition-colors hover:bg-dark-800 sm:left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <figure className="flex max-h-full max-w-full flex-col items-center">
          {item.media_type === "video" ? (
            <video
              key={item.id}
              src={item.url}
              controls
              playsInline
              preload="metadata"
              className="max-h-[75vh] w-auto max-w-full rounded-lg bg-black"
            />
          ) : (
            <img
              key={item.id}
              src={item.url}
              alt={item.title}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
            />
          )}
          <figcaption className="mt-3 max-w-2xl text-center text-sm text-gray-300">
            <span className="font-medium text-white">{item.title}</span>
            {item.description && <span className="block text-gray-400">{caption(item)}</span>}
          </figcaption>
        </figure>

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next item"
            className="absolute right-3 rounded-full bg-black/40 p-3 text-white transition-colors hover:bg-black/60 sm:right-4"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default GalleryLightbox;
