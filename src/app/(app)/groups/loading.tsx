import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PageSkeleton, PageHeaderSkeleton, ScoringGuideSkeleton } from "@/components/skeletons";

export default function GroupsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <ScoringGuideSkeleton />

      {/* 12 group cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSkeleton>
  );
}
