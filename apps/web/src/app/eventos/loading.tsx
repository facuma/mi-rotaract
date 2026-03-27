export default function EventosLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-44 animate-pulse rounded bg-muted" />
      <div className="h-12 w-full animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
