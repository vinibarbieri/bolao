import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Mirrors <PageHeader>: gradient icon chip + title bar + description line. */
export function PageHeaderSkeleton({ description = true }: { description?: boolean }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          {description && <Skeleton className="h-4 w-64" />}
        </div>
      </div>
    </div>
  );
}

/** Mirrors <ScoringGuide>: short pill row. */
export function ScoringGuideSkeleton() {
  return <Skeleton className="h-12 w-full rounded-xl" />;
}

/** Generic card with header + body lines. */
export function CardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <Card className={className}>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

/** Table-style rows for leaderboards. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Standard app page wrapper. */
export function PageSkeleton({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
