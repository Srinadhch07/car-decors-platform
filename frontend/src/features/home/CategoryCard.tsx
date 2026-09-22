import { Link } from "react-router-dom";
import type { Category } from "../../types/api";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      to={`/categories/${category.slug}`}
      className="group relative flex h-44 min-w-[160px] flex-col overflow-hidden rounded-lg border border-border-light bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover snap-start sm:h-52 sm:min-w-[200px]"
      aria-label={`Browse ${category.name}`}
    >
      {/* Image area */}
      <div className="relative h-28 overflow-hidden bg-surface-muted sm:h-36">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent" />
      </div>

      {/* Label */}
      <div className="flex flex-1 items-center px-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-orange-600 sm:text-base">
            {category.name}
          </h3>
          {category.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Hover accent bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-600 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}
