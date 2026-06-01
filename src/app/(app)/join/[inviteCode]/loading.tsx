import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function JoinLoading() {
  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}
