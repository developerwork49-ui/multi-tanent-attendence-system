/** Plain grey placeholder shown for a moment while a protected page checks the session. */
export function PageSkeleton() {
  const block = "animate-pulse rounded-md bg-zinc-100";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className={`h-3 w-28 ${block}`} />
        <div className={`h-7 w-64 max-w-full ${block}`} />
      </div>
      <div className={`h-24 rounded-lg ${block}`} />
      <div className={`h-72 rounded-lg ${block}`} />
    </div>
  );
}
