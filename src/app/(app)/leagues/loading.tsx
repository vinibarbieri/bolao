import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PageHeaderSkeleton, CardSkeleton } from "@/components/skeletons";

export default function LeaguesLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      {/* Create / join row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>

      {/* League list */}
      <CardSkeleton lines={3} />
    </PageSkeleton>
  );
}
