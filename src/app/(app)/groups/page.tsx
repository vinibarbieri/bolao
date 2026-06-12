import { requireUser } from "@/lib/supabase/auth";
import { getTeamsByGroup, getUserGroupPredictions, getGroupMatches, getUserScorePredictions, getUserScoreBreakdown, getTournamentConfig } from "../queries";
import { GroupSimulatorClient } from "@/components/group-simulator/group-simulator-client";
import { PageHeader } from "@/components/page-header";
import { LockedBanner } from "@/components/locked-banner";
import { ScoringGuide } from "@/components/scoring-guide";
import { POINTS as GROUP_POINTS } from "@/lib/scoring/group-scoring";
import { Volleyball } from "lucide-react";
import type { GroupLetter } from "@/lib/stores/group-simulator-store";
import { getTranslations } from "next-intl/server";

export default async function GroupsPage() {
  const user = await requireUser();
  const t = await getTranslations("Groups");

  const [teamsByGroup, predictions, scorePredictions, scoreBreakdown, config] = await Promise.all([
    getTeamsByGroup(),
    getUserGroupPredictions(user.id),
    getUserScorePredictions(user.id),
    getUserScoreBreakdown(user.id),
    getTournamentConfig(),
  ]);
  const locked = config?.isLocked ?? false;

  const teamPointsMap: Record<string, number> = {};
  for (const row of scoreBreakdown.filter((r) => r.category === "group")) {
    const teamId = row.description?.split(" ")[0];
    if (teamId) teamPointsMap[teamId] = (teamPointsMap[teamId] ?? 0) + row.points;
  }

  const groupLetters: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const allGroupMatches: Record<string, Awaited<ReturnType<typeof getGroupMatches>>> = {};
  for (const letter of groupLetters) {
    allGroupMatches[letter] = await getGroupMatches(letter);
  }

  const initialPlacements: Record<string, { teamId: string; teamName: string; position: number }[]> = {};
  const initialScores: Record<string, { matchId: string; homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null }[]> = {};

  for (const letter of groupLetters) {
    const groupTeams = teamsByGroup[letter] || [];
    const groupPreds = predictions.filter((p) => p.groupLetter === letter);

    if (groupPreds.length === 4) {
      initialPlacements[letter] = groupPreds
        .sort((a, b) => a.predictedPosition - b.predictedPosition)
        .map((p) => ({
          teamId: p.teamId,
          teamName: groupTeams.find((t) => t.id === p.teamId)?.name ?? p.teamId,
          position: p.predictedPosition,
        }));
    } else {
      initialPlacements[letter] = groupTeams.map((t, i) => ({
        teamId: t.id,
        teamName: t.name,
        position: i + 1,
      }));
    }

    const groupMatches = allGroupMatches[letter] || [];
    initialScores[letter] = groupMatches.map((m) => {
      const existingScore = scorePredictions.find((sp) => sp.matchId === m.id);
      return {
        matchId: m.id,
        homeTeamId: m.homeTeamId ?? "",
        awayTeamId: m.awayTeamId ?? "",
        homeScore: existingScore?.predictedHomeScore ?? null,
        awayScore: existingScore?.predictedAwayScore ?? null,
      };
    });
  }

  const selectedThirdPlaces = predictions
    .filter((p) => p.predictedPosition === 3 && p.advancesAsThird)
    .map((p) => p.teamId);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Volleyball}
        title={t("title")}
        description={t("description")}
      />

      <ScoringGuide
        items={[
          { label: t("exactPosition"), points: GROUP_POINTS.EXACT_POSITION },
          { label: t("topTwoAdvance"), points: GROUP_POINTS.CORRECT_ADVANCE },
        ]}
      />

      {locked && <LockedBanner />}

      <GroupSimulatorClient
        initialPlacements={initialPlacements}
        initialScores={initialScores}
        initialThirdPlaces={selectedThirdPlaces}
        teamPointsMap={teamPointsMap}
        locked={locked}
      />
    </div>
  );
}
