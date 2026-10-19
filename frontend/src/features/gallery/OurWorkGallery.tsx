import { useCallback, useEffect, useState } from "react";
import { Film, Play } from "lucide-react";
import { api } from "../../lib/api/client";
import type { GalleryListPage, GalleryMediaType } from "../../types/api";
import { EmptyState, ErrorState } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { Pagination } from "../products/Pagination";
import { GalleryLightbox } from "./GalleryLightbox";

const PAGE_SIZE = 12;

const FILTERS: { value: GalleryMediaType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "image", label: "Photos" },
  { value: "video", label: "Videos" },
];

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <div
          key={key}
          className="aspect-[4/3] animate-pulse rounded-xl bg-surface-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function OurWorkGallery() {
  const [mediaType, setMediaType] = useState<GalleryMediaType | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GalleryListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scopeRef = useScrollReveal<HTMLDivElement>("[data-reveal]", {
    y: 28,
    stagger: 0.06,
    start: "top 90%",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const query: { page: number; page_size: number; sort: "order"; media_type?: GalleryMediaType } =
      { page, page_size: PAGE_SIZE, sort: "order" };
    if (mediaType) query.media_type = mediaType;
    api
      .getGallery(query)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load the gallery");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, page, refreshKey]);

  const handleFilter = useCallback((value: GalleryMediaType | "") => {
    setMediaType(value);
    setPage(1);
  }, []);

  const items = data?.items ?? [];

  return (
    <div ref={scopeRef}>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map((filter) => {
          const active = mediaType === filter.value;
          return (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => handleFilter(filter.value)}
              aria-pressed={active}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-border-light bg-white text-text-secondary hover:border-orange-500/40 hover:text-orange-600"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {loading && <GallerySkeleton />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Nothing to show yet"
          description="New work will appear here as soon as it is published."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-reveal
                onClick={() => setLightboxIndex(index)}
                aria-label={`View ${item.title}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-border-light bg-dark-900 text-left shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {item.media_type === "video" ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}

                <span className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-dark-950/10 to-transparent" />

                {item.media_type === "video" && (
                  <>
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-dark-950/70 px-2 py-0.5 text-xs font-medium text-white">
                      <Film className="h-3 w-3" aria-hidden="true" />
                      Video
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-orange-600 shadow-elevated transition-transform group-hover:scale-110">
                        <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                      </span>
                    </span>
                  </>
                )}

                {item.category && (
                  <span className="absolute right-3 top-3 rounded-full bg-orange-600 px-2 py-0.5 text-xs font-medium text-white">
                    {item.category}
                  </span>
                )}

                <span className="absolute bottom-3 left-3 right-3 block text-sm font-semibold text-white">
                  {item.title}
                </span>
              </button>
            ))}
          </div>

          {data && data.total_pages > 1 && (
            <div className="mt-8">
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {lightboxIndex !== null && items[lightboxIndex] && (
        <GalleryLightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

export default OurWorkGallery;
