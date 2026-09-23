import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../../lib/api/client";
import type { Product } from "../../types/api";
import { Container, SectionHeading, ErrorState, LoadingState, EmptyState } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { ProductCard } from "./ProductCard";

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts({ page: 1, page_size: 8 });
      setProducts(data.items.filter((p) => p.is_active));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load products";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 48,
    stagger: 0.1,
    start: "top 85%",
  });

  return (
    <section ref={scopeRef} className="section-y">
      <Container>
        <SectionHeading
          title="Featured Products"
          subtitle="Handpicked accessories for your ride"
          action={
            products.length > 0 ? (
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

        {loading && <LoadingState message="Loading products..." />}

        {error && !loading && (
          <ErrorState message={error} onRetry={fetchProducts} />
        )}

        {!loading && !error && products.length === 0 && (
          <EmptyState
            title="No products yet"
            description="Products will appear here once added to the catalog."
          />
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} data-reveal className="h-full">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
