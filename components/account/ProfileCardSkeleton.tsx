export function ProfileCardSkeleton() {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-[#3c3b39] bg-[#2b2b2b] shadow-lg"
      aria-busy="true"
      aria-label="Loading profile"
    >
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 bg-[#262522] p-4 border-b border-[#3c3b39]">
        <div className="h-16 w-16 shrink-0 rounded-lg bg-[#3c3b39] motion-safe:animate-pulse" />
        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          <div className="h-6 w-3/4 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 divide-y divide-[#3c3b39] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 shrink-0 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
            <div className="flex flex-col gap-2 w-full">
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
                <div className="h-6 w-12 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="h-3 w-16 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
                <div className="h-3 w-20 rounded bg-[#3c3b39] motion-safe:animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
