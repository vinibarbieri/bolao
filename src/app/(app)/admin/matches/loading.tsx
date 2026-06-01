import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PageHeaderSkeleton } from "@/components/skeletons";

export default function MatchesLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </PageSkeleton>
  );
}
