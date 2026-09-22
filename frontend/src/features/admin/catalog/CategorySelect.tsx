import type { Category } from "../../../types/api";

interface CategorySelectProps {
  id: string;
  label?: string;
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
}

/**
 * Reusable category `<select>` backed by admin categories.
 * Pass `includeAll` to add an empty "All categories" option.
 * Shared by the catalog pages and available for product/image forms.
 */
export function CategorySelect({
  id,
  label,
  value,
  onChange,
  categories,
  includeAll = false,
  allLabel = "All categories",
  disabled = false,
}: CategorySelectProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-semibold text-text-primary">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={
          "w-full rounded-md border border-border-light bg-white px-3 py-2.5 text-sm " +
          "text-text-primary outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 " +
          "disabled:pointer-events-none disabled:opacity-50"
        }
      >
        {includeAll && <option value="">{allLabel}</option>}
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
}