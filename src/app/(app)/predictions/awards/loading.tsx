import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PageSkeleton, PageHeaderSkeleton } from "@/components/skeletons";

export default function AwardsLoading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-10 w-32" />
    </PageSkeleton>
  );
}
