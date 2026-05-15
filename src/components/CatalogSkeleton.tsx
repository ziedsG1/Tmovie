export function CatalogSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-12 h-[55vh] min-h-[380px] bg-surface-raised" />
      <div className="space-y-10 px-4 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="mb-4 h-8 w-48 rounded bg-surface-card" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="h-[240px] w-[140px] flex-shrink-0 rounded-lg bg-surface-card"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}