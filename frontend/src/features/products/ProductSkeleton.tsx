export function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border-light bg-white shadow-card">
      <div className="aspect-square animate-pulse bg-surface-muted" />
      <div className="p-3 sm:p-4">
        <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="mb-2 h-5 w-1/3 animate-pulse rounded bg-surface-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
