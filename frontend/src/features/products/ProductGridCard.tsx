import { Link } from "react-router-dom";
import type { Product } from "../../types/api";
import { formatPrice, availabilityLabel } from "../../lib/utils/format";
import { Badge } from "../../components/ui";
import { useTilt } from "../../lib/motion";
import { ProductShareButton } from "./ProductShareButton";

interface ProductGridCardProps {
  product: Product;
}

/**
 * Premium catalogue card for the Products listing page.
 *
 * The share control is rendered as a sibling of the card link (never nested
 * inside it) so it can float above the image without triggering navigation.
 * Uses only themeable utilities, and never fabricates data the API does not
 * provide (no ratings, discounts or stock counts).
 */
export function ProductGridCard({ product }: ProductGridCardProps) {
  const tiltRef = useTilt<HTMLDivElement>(5);

  const availVariant =
    product.availability === "IN_STOCK"
      ? "success"
      : product.availability === "OUT_OF_STOCK"
        ? "error"
        : "warning";

  const isFallback = !product.image_url;

  return (
    <div
      ref={tiltRef}
      className="group relative h-full transition-transform duration-300 ease-out"
    >
      <div className="relative h-full rounded-2xl border border-border-light bg-surface shadow-card transition-[border-color,box-shadow] duration-300 group-hover:border-orange-500/40 group-hover:shadow-elevated">
        <Link
          to={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
          className="flex h-full flex-col overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-surface-muted">
            <img
              src={product.image_url ?? "/images/product-fallback.svg"}
              alt={isFallback ? "" : product.name}
              aria-hidden={isFallback || undefined}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] ${
                isFallback ? "opacity-60" : ""
              }`}
              onError={(event) => {
                const img = event.currentTarget;
                if (!img.src.endsWith("/images/product-fallback.svg")) {
                  img.src = "/images/product-fallback.svg";
                }
              }}
            />

            {/* Depth wash on hover */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-950/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />

            {/* Availability */}
            <div className="absolute left-3 top-3">
              <Badge variant={availVariant}>{availabilityLabel(product.availability)}</Badge>
            </div>

            {/* Theme accent line */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-600 transition-all duration-300 group-hover:w-full"
            />
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-3 sm:p-4">
            <h3 className="line-clamp-2 text-sm font-semibold text-text-primary transition-colors group-hover:text-orange-600 sm:text-base">
              {product.name}
            </h3>

            <p className="mt-2 text-base font-bold text-orange-600">
              {formatPrice(product.price)}
            </p>

            {product.vehicle_tags.length > 0 && (
              <p className="mt-2 line-clamp-1 text-xs text-text-muted">
                Fits: {product.vehicle_tags.slice(0, 3).join(", ")}
                {product.vehicle_tags.length > 3 &&
                  ` +${product.vehicle_tags.length - 3} more`}
              </p>
            )}
          </div>
        </Link>

        {/* Share — sibling of the link, floated above it */}
        <div className="absolute right-2.5 top-2.5 z-20">
          <ProductShareButton name={product.name} slug={product.slug} />
        </div>
      </div>
    </div>
  );
}
