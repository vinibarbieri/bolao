import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PageHeaderSkeleton, ScoringGuideSkeleton } from "@/components/skeletons";

export default function ThirdPlaceLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ScoringGuideSkeleton />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PageSkeleton>
  );
}
