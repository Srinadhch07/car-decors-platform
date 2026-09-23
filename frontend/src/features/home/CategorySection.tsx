import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../../lib/api/client";
import type { Category } from "../../types/api";
import { Container, SectionHeading, ErrorState, LoadingState, EmptyState } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { CategoryCard } from "./CategoryCard";

export function CategorySection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCategories();
      setCategories(data.filter((c) => c.is_active));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load categories";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 40,
    stagger: 0.08,
    start: "top 88%",
  });

  return (
    <section ref={scopeRef} className="section-y bg-surface-muted">
      <Container>
        <SectionHeading
          title="Shop by Category"
          subtitle="Browse our range of car accessories and decor"
          action={
            categories.length > 0 ? (
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />

        {loading && <LoadingState message="Loading categories..." />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchCategories} />
        )}

        {!loading && !error && categories.length === 0 && (
          <EmptyState
            title="No categories yet"
            description="Categories will appear here once configured."
          />
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:snap-none sm:gap-5">
            {categories.map((cat, index) => (
              <div
                key={cat.id}
                data-reveal
                className="flex min-w-[160px] flex-col snap-start sm:min-w-0 sm:flex-1 sm:basis-[calc(33.333%-1.5rem)] sm:snap-none"
              >
                <CategoryCard category={cat} index={index + 1} />
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
