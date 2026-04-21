export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-drac-bg-tertiary/50 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-drac-accent/5 to-transparent animate-shimmer" />
    </div>
  );
}

export function FileItemSkeleton() {
  return (
    <div className="bg-drac-bg-primary rounded-md p-3 flex items-center border border-transparent animate-fade-in">
      <Skeleton className="w-[18px] h-[18px] mr-3" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
