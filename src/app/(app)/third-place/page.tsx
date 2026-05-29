import { requireUser } from "@/lib/supabase/auth";
import { getUserGroupPredictions, getTeamsByGroup, getUserScoreBreakdown } from "../queries";
import { ThirdPlaceSelectorClient } from "@/components/third-place/third-place-selector-client";
import { PageHeader } from "@/components/page-header";
import { ScoringGuide } from "@/components/scoring-guide";
import { POINTS as GROUP_POINTS } from "@/lib/scoring/group-scoring";
import { Medal, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function ThirdPlacePage() {
  const user = await requireUser();
  const t = await getTranslations("ThirdPlace");

  const [predictions, teamsByGroup, scoreBreakdown] = await Promise.all([
    getUserGroupPredictions(user.id),
    getTeamsByGroup(),
    getUserScoreBreakdown(user.id),
  ]);

  const earnedThirdSet = new Set<string>();
  for (const row of scoreBreakdown.filter((r) => r.category === "group")) {
    if (row.description?.includes("qualifying 3rd-place")) {
      const teamId = row.description.split(" ")[0];
      earnedThirdSet.add(teamId);
    }
  }

  const thirdPlaceTeams = predictions
    .filter((p) => p.predictedPosition === 3)
    .map((p) => {
      const groupTeams = teamsByGroup[p.groupLetter] || [];
      const team = groupTeams.find((t) => t.id === p.teamId);
      return {
        teamId: p.teamId,
        teamName: team?.name ?? p.teamId,
        groupLetter: p.groupLetter,
        isSelected: p.advancesAsThird,
      };
    });

  const hasAllGroups = thirdPlaceTeams.length === 12;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Medal}
        title={t("title")}
        description={t("description")}
      />

      <ScoringGuide items={[{ label: t("eachCorrectQualifier"), points: GROUP_POINTS.CORRECT_THIRD_QUALIFIES }]} />

      {!hasAllGroups ? (
        <div className="flex items-start gap-3 rounded-xl border border-third/50 bg-third/10 p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-third-foreground" />
          <div>
            <p className="font-medium text-third-foreground">
              {t("completeGroupsFirst")}
            </p>
            <p className="mt-1 text-sm text-third-foreground/80">
              {t("groupsCompleted", { count: thirdPlaceTeams.length })}
            </p>
          </div>
        </div>
      ) : (
        <ThirdPlaceSelectorClient teams={thirdPlaceTeams} earnedThirdSet={Array.from(earnedThirdSet)} />
      )}
    </div>
  );
}
