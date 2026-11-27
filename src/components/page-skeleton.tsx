/** Shimmering glass placeholder shown for a moment while a protected page checks the session. */
export function PageSkeleton() {
  const block = "relative overflow-hidden rounded-2xl bg-[rgb(255_255_255/0.04)] ring-1 ring-[rgb(255_255_255/0.06)] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-[rgb(229_192_123/0.08)] after:to-transparent";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className={`h-3 w-28 ${block}`} />
        <div className={`h-10 w-72 max-w-full ${block}`} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-32 rounded-3xl ${block}`} />
        ))}
      </div>
      <div className={`h-72 rounded-3xl ${block}`} />
    </div>
  );
}
