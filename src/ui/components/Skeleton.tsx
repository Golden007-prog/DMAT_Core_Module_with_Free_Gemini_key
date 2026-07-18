/** Purely decorative loading placeholders. Respect reduced-motion by holding
 *  still instead of pulsing, and stay out of the accessibility tree. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-zinc-100 motion-reduce:animate-none dark:bg-zinc-800 ${className}`}
    />
  );
}

/** A card-shaped skeleton with a heading bar and `lines` body bars, matching
 *  the app's card idiom so it occupies the same footprint as the real content. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt"
    >
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
