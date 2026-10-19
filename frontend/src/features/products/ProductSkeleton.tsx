/**
 * Catalogue loading placeholder. Mirrors the shape of ProductGridCard (image,
 * availability badge, name, price) so the grid does not shift when real data
 * arrives. Uses only themeable surface tokens.
 */
export function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-light bg-surface shadow-card">
      <div className="relative aspect-square animate-pulse bg-surface-muted">
        <div className="absolute left-3 top-3 h-5 w-16 rounded-full bg-surface-dim" />
        <div className="absolute right-2.5 top-2.5 h-9 w-9 rounded-full bg-surface-dim" />
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-surface-muted" />
      </div>
    </div>
  );
}
