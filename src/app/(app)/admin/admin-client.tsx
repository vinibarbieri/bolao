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
import {
  ListChecks,
  Lock,
  RefreshCw,
  CalendarClock,
  Activity,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Admin");
  const [locking, setLocking] = useState(false);
  const [syncingPlayers, setSyncingPlayers] = useState(false);

  const handleLockPredictions = async () => {
    setLocking(true);
    try {
      const res = await fetch("/api/admin/lock-predictions", {
        method: "POST",
      });
      if (!res.ok) throw new Error(t("failedLock"));
      toast.success(t("predictionsLocked"));
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedLockGeneric")
      );
    } finally {
      setLocking(false);
    }
  };

  const handleSyncPlayers = async () => {
    setSyncingPlayers(true);
    try {
      const res = await fetch("/api/admin/sync-players", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("failedSync"));
      toast.success(t("syncedPlayers", { inserted: data.inserted, updated: data.updated }));
      if (data.unmatchedTeams?.length) {
        toast.warning(t("unmatchedTeams", { teams: data.unmatchedTeams.join(", ") }));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedSync"),
      );
    } finally {
      setSyncingPlayers(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      if (!res.ok) throw new Error(t("failedRecalculate"));
      toast.success(t("scoresRecalculated"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedRecalculate")
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t("tournamentStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("stage")}</span>
            <Badge variant="secondary">
              {config?.currentStage ?? t("notConfigured")}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {t("predictions")}
            </span>
            <Badge
              className={cn(
                config?.isLocked
                  ? "bg-eliminated/15 text-eliminated-foreground"
                  : "bg-qualified/15 text-qualified-foreground",
              )}
            >
              {config?.isLocked ? (
                <>
                  <Lock className="mr-1 h-3 w-3" /> {t("locked")}
                </>
              ) : (
                t("open")
              )}
            </Badge>
          </div>
          {config?.predictionsLockAt && (
            <div className="flex items-center gap-3">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t("lockAt")}</span>
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5 text-chart-2" />
              {t("matchResults")}
            </CardTitle>
            <CardDescription>{t("enterScores")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/matches">
              <Button variant="outline" className="w-full">
                {t("manageMatches")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-eliminated" />
              {t("lockPredictions")}
            </CardTitle>
            <CardDescription>{t("preventChanges")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLockPredictions}
              disabled={config?.isLocked === true || locking}
              variant="destructive"
              className="w-full gap-2"
            >
              <Lock className="h-4 w-4" />
              {config?.isLocked ? t("alreadyLocked") : t("lockNow")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 text-chart-3" />
              {t("recalculateScores")}
            </CardTitle>
            <CardDescription>{t("recomputeAll")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRecalculate}
              variant="secondary"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t("recalculateAll")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-chart-4" />
              {t("syncPlayers")}
            </CardTitle>
            <CardDescription>{t("importSquads")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncPlayers}
              disabled={syncingPlayers}
              variant="secondary"
              className="w-full gap-2"
            >
              <Users className="h-4 w-4" />
              {syncingPlayers ? t("syncing") : t("syncPlayers")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
