import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton, PageHeaderSkeleton } from "@/components/skeletons";

export default function BracketLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      {/* Bracket columns */}
      <div className="flex gap-6 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, col) => (
          <div key={col} className="flex min-w-[200px] flex-col justify-around gap-4">
            {Array.from({ length: Math.max(1, 8 >> col) }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
