export default function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    </div>
  );
}