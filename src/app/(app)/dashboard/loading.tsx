import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageSkeleton, CardSkeleton } from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <PageSkeleton>
      {/* Hero banner */}
      <Skeleton className="h-44 w-full rounded-2xl" />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="gap-2 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaderboard + checklist */}
      <CardSkeleton lines={5} />
    </PageSkeleton>
  );
}
