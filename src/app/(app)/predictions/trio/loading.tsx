import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PageHeaderSkeleton, ScoringGuideSkeleton } from "@/components/skeletons";

export default function TrioLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ScoringGuideSkeleton />

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-10 w-32" />
    </PageSkeleton>
  );
}
