"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface TournamentConfig {
  id: number;
  predictionsLockAt: Date;
  isLocked: boolean | null;
  currentStage: string;
}

export function AdminClient({
  config,
  userId,
}: {
  config: TournamentConfig | null;
  userId: string;
}) {
  const [locking, setLocking] = useState(false);

  const handleLockPredictions = async () => {
    setLocking(true);
    try {
      const res = await fetch("/api/admin/lock-predictions", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to lock predictions");
      toast.success("Predictions locked!");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to lock"
      );
    } finally {
      setLocking(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      if (!res.ok) throw new Error("Failed to recalculate");
      toast.success("Scores recalculated!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to recalculate"
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tournament Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Stage:</span>
            <Badge>{config?.currentStage ?? "Not configured"}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Predictions:
            </span>
            <Badge variant={config?.isLocked ? "destructive" : "default"}>
              {config?.isLocked ? "Locked" : "Open"}
            </Badge>
          </div>
          {config?.predictionsLockAt && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Lock at:</span>
              <span className="text-sm">
                {new Date(config.predictionsLockAt).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Match Results</CardTitle>
            <CardDescription>Enter scores and MOTM</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/matches">
              <Button variant="outline" className="w-full">
                Manage Matches
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lock Predictions</CardTitle>
            <CardDescription>
              Prevent further prediction changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLockPredictions}
              disabled={config?.isLocked === true || locking}
              variant="destructive"
              className="w-full"
            >
              {config?.isLocked ? "Already Locked" : "Lock Now"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recalculate Scores</CardTitle>
            <CardDescription>
              Recompute all user scores and leaderboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRecalculate}
              variant="secondary"
              className="w-full"
            >
              Recalculate All
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
