import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "Nothing here yet",
  description = "We couldn't find any items to display.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <PackageOpen className="mb-4 h-12 w-12 text-text-muted" />
      <h3 className="mb-1 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mb-4 max-w-sm text-text-secondary">{description}</p>
      {action}
    </div>
  );
}
