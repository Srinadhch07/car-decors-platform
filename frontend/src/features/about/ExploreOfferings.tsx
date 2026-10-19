import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../../lib/api/client";
import type { Category } from "../../types/api";
import {
  Container,
  SectionHeading,
  ErrorState,
  LoadingState,
  EmptyState,
} from "../../components/ui";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { OFFERING_LIMIT } from "./aboutContent";
import { GeoDrift, PerspectiveGrid } from "./AboutDecor";

interface OfferingCardProps {
  category: Category;
  index: number;
  featured: boolean;
}

function OfferingCard({ category, index, featured }: OfferingCardProps) {
  return (
    <Link
      to={`/categories/${category.slug}`}
      aria-label={`Browse ${category.name}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border-light bg-dark-900 shadow-card transition-shadow hover:shadow-card-hover ${
        featured ? "h-64 sm:col-span-2 sm:h-80" : "h-56"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={category.image_url || "/images/category-fallback.svg"}
          alt={category.image_url ? category.name : ""}
          aria-hidden={category.image_url ? undefined : "true"}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            category.image_url ? "" : "opacity-60"
          }`}
          onError={(event) => {
            event.currentTarget.src = "/images/category-fallback.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/85 via-dark-950/20 to-transparent" />
      </div>

      <div className="relative p-4">
        <span className="font-mono text-xs font-semibold tracking-tight text-white/60">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      <div className="relative mt-auto p-5">
        <h3 className="text-lg font-bold text-white sm:text-xl">
          {category.name}
        </h3>
        {category.description && (
          <p className="mt-1 line-clamp-2 text-xs text-white/70 sm:text-sm">
            {category.description}
          </p>
        )}
      </div>

      <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-600 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

export function ExploreOfferings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCategories();
      setCategories(data.filter((c) => c.is_active).slice(0, OFFERING_LIMIT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 32,
    stagger: 0.08,
    start: isMobileViewport() ? "top 65%" : "top 85%",
  });

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface-muted">
      <PerspectiveGrid className="inset-x-0 bottom-0 h-1/2 w-full opacity-60" />
      <GeoDrift className="inset-0 hidden lg:block" />

      <Container className="relative z-10">
        <div data-reveal>
          <SectionHeading
            eyebrow="Collections"
            title="Explore Our Offerings"
            subtitle="A quick look at the kinds of car accessories and decor we work with."
            action={
              categories.length > 0 ? (
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  View All Products
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
        </div>

        {loading && <LoadingState message="Loading offerings..." />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchCategories} />
        )}

        {!loading && !error && categories.length === 0 && (
          <EmptyState
            title="Offerings coming soon"
            description="Our product categories will appear here once they are configured."
          />
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <div key={category.id} data-reveal className={index === 0 ? "sm:col-span-2" : undefined}>
                <OfferingCard
                  category={category}
                  index={index + 1}
                  featured={index === 0}
                />
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
