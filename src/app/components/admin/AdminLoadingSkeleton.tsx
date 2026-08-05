// Generalizes ModerationPage.tsx's inline pulse-skeleton cards into a reusable,
// row-count-configurable loading state for admin tables/card lists.
interface AdminLoadingSkeletonProps {
  rows?: number;
}

export default function AdminLoadingSkeleton({ rows = 3 }: AdminLoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border border-neutral-200 rounded-xl p-5 animate-pulse">
          <div className="flex gap-2 mb-3">
            <div className="h-4 bg-neutral-200 rounded w-16" />
            <div className="h-4 bg-neutral-200 rounded w-32" />
          </div>
          <div className="h-3 bg-neutral-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
