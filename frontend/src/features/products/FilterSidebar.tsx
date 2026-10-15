import type { Category, ProductAvailability } from "../../types/api";
import { availabilityLabel } from "../../lib/utils/format";

interface FilterSidebarProps {
  categories: Category[];
  subcategories: { name: string; slug: string }[];
  selectedCategory: string;
  selectedSubcategory: string;
  selectedAvailability: ProductAvailability | "";
  selectedSort: string;
  vehicle: string;
  onCategoryChange: (slug: string) => void;
  onSubcategoryChange: (slug: string) => void;
  onAvailabilityChange: (value: ProductAvailability | "") => void;
  onSortChange: (value: string) => void;
  onVehicleChange: (value: string) => void;
}

export function FilterSidebar({
  categories,
  subcategories,
  selectedCategory,
  selectedSubcategory,
  selectedAvailability,
  selectedSort,
  vehicle,
  onCategoryChange,
  onSubcategoryChange,
  onAvailabilityChange,
  onSortChange,
  onVehicleChange,
}: FilterSidebarProps) {
  return (
    <div className="space-y-5">
      {/* Sort */}
      <div>
        <label htmlFor="filter-sort" className="field-label">
          Sort By
        </label>
        <select
          id="filter-sort"
          value={selectedSort}
          onChange={(e) => onSortChange(e.target.value)}
          className="field"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name_asc">Name: A to Z</option>
          <option value="name_desc">Name: Z to A</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="filter-category" className="field-label">
          Category
        </label>
        <select
          id="filter-category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="field"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Subcategory — only when a category is selected */}
      {selectedCategory && subcategories.length > 0 && (
        <div>
          <label htmlFor="filter-subcategory" className="field-label">
            Subcategory
          </label>
          <select
            id="filter-subcategory"
            value={selectedSubcategory}
            onChange={(e) => onSubcategoryChange(e.target.value)}
            className="field"
          >
            <option value="">All Subcategories</option>
            {subcategories.map((sub) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Vehicle */}
      <div>
        <label htmlFor="filter-vehicle" className="field-label">
          Vehicle
        </label>
        <input
          id="filter-vehicle"
          type="text"
          value={vehicle}
          onChange={(e) => onVehicleChange(e.target.value)}
          placeholder="e.g. Hyundai Creta"
          className="field"
        />
      </div>

      {/* Availability */}
      <div>
        <label htmlFor="filter-availability" className="field-label">
          Availability
        </label>
        <select
          id="filter-availability"
          value={selectedAvailability}
          onChange={(e) => onAvailabilityChange(e.target.value as ProductAvailability | "")}
          className="field"
        >
          <option value="">All</option>
          <option value="IN_STOCK">{availabilityLabel("IN_STOCK")}</option>
          <option value="OUT_OF_STOCK">{availabilityLabel("OUT_OF_STOCK")}</option>
          <option value="ON_ORDER">{availabilityLabel("ON_ORDER")}</option>
        </select>
      </div>
    </div>
  );
}
