import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, CardSkeleton } from "@/components/skeletons";

export default function CompareLoading() {
  return (
    <PageSkeleton>
      {/* Avatar header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <Skeleton className="h-8 w-64" />
      </div>

      <CardSkeleton lines={4} />
      <CardSkeleton lines={4} />
    </PageSkeleton>
  );
}
