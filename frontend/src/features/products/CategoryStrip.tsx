import type { Category } from "../../types/api";

interface CategoryStripProps {
  categories: Category[];
  selectedCategory: string;
  onSelect: (slug: string) => void;
}

/**
 * Horizontal, theme-aware category browser that filters the catalogue in place.
 * Tiles use the admin-managed category image when available and fall back to
 * the shipped placeholder otherwise. Rendered as buttons (not links) so the
 * active filter state stays on the Products page.
 */
export function CategoryStrip({ categories, selectedCategory, onSelect }: CategoryStripProps) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="shop-by-category" className="py-6">
      <h2
        id="shop-by-category"
        className="mb-4 text-lg font-bold tracking-tight text-text-primary"
      >
        Shop by Category
      </h2>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <CategoryTile
          label="All Categories"
          selected={selectedCategory === ""}
          onClick={() => onSelect("")}
          fallbackIcon
        />
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            label={category.name}
            imageUrl={category.image_url}
            selected={selectedCategory === category.slug}
            onClick={() => onSelect(category.slug)}
          />
        ))}
      </div>
    </section>
  );
}

interface CategoryTileProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  imageUrl?: string | null;
  fallbackIcon?: boolean;
}

function CategoryTile({ label, selected, onClick, imageUrl, fallbackIcon }: CategoryTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative h-28 w-36 shrink-0 snap-start overflow-hidden rounded-xl border text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:h-32 sm:w-44 ${
        selected
          ? "border-orange-600 ring-2 ring-orange-500/40"
          : "border-border-light hover:border-orange-500/40"
      }`}
    >
      <span className="absolute inset-0 bg-dark-900" aria-hidden="true" />
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(event) => {
            const img = event.currentTarget;
            img.style.display = "none";
          }}
        />
      ) : fallbackIcon ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 carbon-texture opacity-80"
        />
      ) : (
        <img
          src="/images/category-fallback.svg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-500 ease-out group-hover:scale-105"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-dark-950/85 via-dark-950/25 to-transparent"
      />
      <span className="relative flex h-full items-end p-3">
        <span className="text-sm font-semibold leading-tight text-white">
          {label}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-0.5 bg-orange-600 transition-all duration-300 ${
          selected ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </button>
  );
}
