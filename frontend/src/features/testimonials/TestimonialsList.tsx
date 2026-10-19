import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api/client";
import type { TestimonialListPage } from "../../types/api";
import { EmptyState, ErrorState } from "../../components/ui";
import { Pagination } from "../products/Pagination";
import { useScrollReveal } from "../../lib/motion";
import { TestimonialGalleryCard } from "./TestimonialGalleryCard";

const PAGE_SIZE = 6;

function GallerySkeleton() {
  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <div
          key={key}
          className="mb-5 break-inside-avoid animate-pulse rounded-2xl bg-surface-muted"
          style={{ height: `${11 + (key % 3) * 3}rem` }}
        />
      ))}
    </div>
  );
}

export function TestimonialsList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TestimonialListPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const scopeRef = useScrollReveal<HTMLDivElement>("[data-reveal]", {
    y: 28,
    stagger: 0.07,
    start: "top 90%",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getTestimonials({ page, page_size: PAGE_SIZE })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load testimonials");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  if (loading) {
    return <GallerySkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => setRefreshKey((key) => key + 1)} />;
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="No testimonials yet"
        description="Be the first to share your experience with our products and service."
      />
    );
  }

  return (
    <div ref={scopeRef}>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {data.items.map((testimonial) => (
          <div key={testimonial.id} data-reveal className="break-inside-avoid">
            <TestimonialGalleryCard testimonial={testimonial} />
          </div>
        ))}
      </div>
      {data.total_pages > 1 && (
        <div className="mt-8">
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export default TestimonialsList;
