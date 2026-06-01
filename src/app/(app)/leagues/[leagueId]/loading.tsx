import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PageSkeleton, TableSkeleton } from "@/components/skeletons";

export default function LeagueDetailLoading() {
  return (
    <PageSkeleton>
      {/* League header */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} />
        </CardContent>
      </Card>
    </PageSkeleton>
  );
}
