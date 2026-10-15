export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-16 text-text-muted">
      <div className="relative mb-5 h-10 w-10">
        <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/15" />
        <div className="absolute inset-0 m-auto h-6 w-6 animate-spin rounded-full border-2 border-border border-t-orange-500" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
