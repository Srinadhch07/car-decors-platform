import { Link } from "react-router-dom";
import type { Product } from "../../types/api";
import { formatPrice, availabilityLabel } from "../../lib/utils/format";
import { Badge } from "../../components/ui";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const availVariant =
    product.availability === "IN_STOCK"
      ? "success"
      : product.availability === "OUT_OF_STOCK"
        ? "error"
        : "warning";

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border-light bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/30 hover:shadow-card-hover"
      aria-label={`View ${product.name}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/images/product-fallback.svg";
            }}
          />
        ) : (
          <img
            src="/images/product-fallback.svg"
            alt=""
            className="h-full w-full object-cover opacity-60"
            aria-hidden="true"
          />
        )}
        {/* Availability badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge variant={availVariant}>
            {availabilityLabel(product.availability)}
          </Badge>
        </div>
        {/* Hover accent bar */}
        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-600 transition-all duration-300 group-hover:w-full" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-primary transition-colors group-hover:text-orange-600 sm:text-base">
          {product.name}
        </h3>

        {/* Price */}
        <p className="mt-2 text-base font-bold text-orange-600">
          {formatPrice(product.price)}
        </p>

        {/* Vehicle tags */}
        {product.vehicle_tags.length > 0 && (
          <p className="mt-2 line-clamp-1 text-xs text-text-muted">
            Fits: {product.vehicle_tags.slice(0, 3).join(", ")}
            {product.vehicle_tags.length > 3 && ` +${product.vehicle_tags.length - 3} more`}
          </p>
        )}
      </div>
    </Link>
  );
}
