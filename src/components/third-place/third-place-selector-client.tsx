"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveThirdPlaceSelections } from "@/app/(app)/actions";
import { TeamFlag } from "@/components/team-badge";
import { cn } from "@/lib/utils";
import { Check, Medal, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ThirdPlaceTeam {
  teamId: string;
  teamName: string;
  groupLetter: string;
  isSelected: boolean;
}

interface Props {
  teams: ThirdPlaceTeam[];
  earnedThirdSet?: string[];
}

export function ThirdPlaceSelectorClient({ teams, earnedThirdSet = [] }: Props) {
  const t = useTranslations("ThirdPlace");
  const earnedSet = new Set(earnedThirdSet);
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(teams.filter((t) => t.isSelected).map((t) => t.teamId))
  );
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (selected.size !== 8) return;
    setSaving(true);
    try {
      await saveThirdPlaceSelections(Array.from(selected));
      toast.success(t("saved"));
      router.push("/bracket");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedSave")
      );
    } finally {
      setSaving(false);
    }
  };

  const complete = selected.size === 8;

  return (
    <div className="space-y-6">
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
          {saving ? t("saving") : t("saveAndBuild")}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    <p className="truncate font-medium">{team.teamName}</p>
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
