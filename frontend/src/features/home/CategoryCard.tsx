import { Link } from "react-router-dom";
import type { Category } from "../../types/api";

interface CategoryCardProps {
  category: Category;
  index?: number;
}

export function CategoryCard({ category, index }: CategoryCardProps) {
  return (
    <Link
      to={`/categories/${category.slug}`}
      className="group relative flex h-52 flex-col overflow-hidden rounded-xl border border-border-light bg-dark-900 shadow-card transition-shadow hover:shadow-card-hover sm:h-64"
      aria-label={`Browse ${category.name}`}
    >
      {/* Image area (editorial full-bleed) */}
      <div className="absolute inset-0 overflow-hidden">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/images/category-fallback.svg";
            }}
          />
        ) : (
          <img
            src="/images/category-fallback.svg"
            alt=""
            className="h-full w-full object-cover opacity-60"
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/85 via-dark-950/15 to-transparent transition-opacity duration-500 group-hover:from-dark-950/90" />
      </div>

      {/* Index */}
      {typeof index === "number" && (
        <span className="absolute top-3 right-3 font-mono text-sm font-semibold tracking-tight text-white/60">
          {String(index).padStart(2, "0")}
        </span>
      )}

      {/* Label overlay */}
      <div className="relative mt-auto p-4 pb-3">
        <h3 className="text-base font-bold text-white transition-transform duration-300 group-hover:-translate-y-0.5 sm:text-lg">
          {category.name}
        </h3>
        {category.description && (
          <p className="mt-1 line-clamp-2 text-xs text-white/70">{category.description}</p>
        )}
      </div>

      {/* Hover accent bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-600 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}