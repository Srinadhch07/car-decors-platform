export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-muted">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-orange-500" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
