"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveThirdPlaceSelections } from "@/app/(app)/actions";
import { TeamFlag } from "@/components/team-badge";
import { TeamName } from "@/components/team-name";
import { cn } from "@/lib/utils";
import { Check, Medal, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

interface ThirdPlaceTeam {
  teamId: string;
  teamName: string;
  groupLetter: string;
  isSelected: boolean;
}

interface Props {
  teams: ThirdPlaceTeam[];
  earnedThirdSet?: string[];
  /** Render predictions read-only (tournament started). */
  locked?: boolean;
}

export function ThirdPlaceSelectorClient({ teams, earnedThirdSet = [], locked = false }: Props) {
  const t = useTranslations("ThirdPlace");
  const earnedSet = new Set(earnedThirdSet);
  const router = useRouter();
  const initialKey = useMemo(
    () =>
      teams
        .filter((t) => t.isSelected)
        .map((t) => t.teamId)
        .sort()
        .join(","),
    [teams],
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(teams.filter((t) => t.isSelected).map((t) => t.teamId))
  );
  const [saving, setSaving] = useState(false);
  // Baseline the dirty check compares against. Starts at the server state and
  // advances to the saved selection on each successful save, so the page is
  // clean (no unsaved-changes guard) right after saving.
  const [savedKey, setSavedKey] = useState(initialKey);

  const isDirty =
    Array.from(selected).sort().join(",") !== savedKey;

  const toggleTeam = useCallback((teamId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else if (next.size < 8) {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  // Persist + toast + rethrow on failure (no navigation). Reused by the Save
  // button and the unsaved-changes guard.
  const commit = useCallback(async () => {
    setSaving(true);
    try {
      await saveThirdPlaceSelections(Array.from(selected));
      // Clear dirty state so the unsaved-changes guard disarms post-save.
      setSavedKey(Array.from(selected).sort().join(","));
      toast.success(t("saved"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedSave")
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }, [selected, t]);

  const handleSave = async () => {
    if (selected.size !== 8) return;
    try {
      await commit();
      // Drop the stale prefetched /bracket RSC so it renders against the
      // just-saved third-place selection instead of the pre-save payload.
      router.refresh();
      router.push("/bracket");
    } catch {
      // commit already toasted; stay on the page.
    }
  };

  const complete = selected.size === 8;

  // Only offer "Save & leave" when the selection is valid (exactly 8).
  useUnsavedChanges({ isDirty: !locked && isDirty, onSave: complete ? commit : undefined });

  return (
    <div className="space-y-6">
      {!locked && (
      <div className="sticky top-16 z-20 flex items-center gap-4 rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Medal
            className={cn(
              "h-5 w-5",
              complete ? "text-qualified" : "text-third",
            )}
          />
          <span className="text-sm font-semibold">
            {selected.size}
            <span className="text-muted-foreground">{t("selected")}</span>
          </span>
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              complete ? "bg-qualified" : "bg-brand-gradient",
            )}
            style={{ width: `${(selected.size / 8) * 100}%` }}
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={!complete || saving}
          className="gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? t("saving") : t("saveAndBuild")}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
      )}

      <div className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        locked && "pointer-events-none opacity-90",
      )}>
        {teams
          .sort((a, b) => a.groupLetter.localeCompare(b.groupLetter))
          .map((team) => {
            const isChecked = selected.has(team.teamId);
            const isDisabled = !isChecked && selected.size >= 8;

            return (
              <Card
                key={team.teamId}
                className={cn(
                  "cursor-pointer transition-all",
                  isChecked
                    ? "border-qualified ring-1 ring-qualified/40 bg-qualified/5"
                    : isDisabled
                      ? "opacity-50"
                      : "hover:border-primary/50 hover:shadow-sm",
                )}
                onClick={() => !isDisabled && toggleTeam(team.teamId)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isChecked
                        ? "border-qualified bg-qualified/25 text-qualified-foreground"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <TeamFlag teamId={team.teamId} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium"><TeamName teamId={team.teamId} /></p>
                    <p className="text-xs text-muted-foreground">
                      {t("thirdInGroup", { letter: team.groupLetter })}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {team.teamId}
                  </Badge>
                  {earnedSet.has(team.teamId) && (
                    <span className="rounded-full bg-qualified/15 px-2 py-0.5 font-mono text-xs font-bold text-qualified-foreground">
                      +2
                    </span>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
