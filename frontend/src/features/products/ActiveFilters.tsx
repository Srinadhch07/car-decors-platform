import { X } from "lucide-react";

interface FilterChip {
  key: string;
  label: string;
}

interface ActiveFiltersProps {
  filters: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-border-light bg-surface-muted px-3 py-1 text-xs font-medium text-text-secondary"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-surface-dim"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
      >
        Clear All
      </button>
    </div>
  );
}
