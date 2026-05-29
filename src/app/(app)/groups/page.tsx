import { requireUser } from "@/lib/supabase/auth";
import { getTeamsByGroup, getUserGroupPredictions, getGroupMatches, getUserScorePredictions } from "../queries";
import { GroupSimulatorClient } from "@/components/group-simulator/group-simulator-client";
import { PageHeader } from "@/components/page-header";
import { Volleyball } from "lucide-react";
import type { GroupLetter } from "@/lib/stores/group-simulator-store";

export default async function GroupsPage() {
  const user = await requireUser();

  const [teamsByGroup, predictions, scorePredictions] = await Promise.all([
    getTeamsByGroup(),
    getUserGroupPredictions(user.id),
    getUserScorePredictions(user.id),
  ]);

  // Fetch all group matches
  const groupLetters: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const allGroupMatches: Record<string, Awaited<ReturnType<typeof getGroupMatches>>> = {};
  for (const letter of groupLetters) {
    allGroupMatches[letter] = await getGroupMatches(letter);
  }

  // Build initial placements from predictions or default order
  const initialPlacements: Record<string, { teamId: string; teamName: string; position: number }[]> = {};
  const initialScores: Record<string, { matchId: string; homeTeamId: string; awayTeamId: string; homeScore: number | null; awayScore: number | null }[]> = {};

  for (const letter of groupLetters) {
    const groupTeams = teamsByGroup[letter] || [];
    const groupPreds = predictions.filter((p) => p.groupLetter === letter);

    if (groupPreds.length === 4) {
      // Use existing predictions
      initialPlacements[letter] = groupPreds
        .sort((a, b) => a.predictedPosition - b.predictedPosition)
        .map((p) => ({
          teamId: p.teamId,
          teamName: groupTeams.find((t) => t.id === p.teamId)?.name ?? p.teamId,
          position: p.predictedPosition,
        }));
    } else {
      // Default order
      initialPlacements[letter] = groupTeams.map((t, i) => ({
        teamId: t.id,
        teamName: t.name,
        position: i + 1,
      }));
    }

    // Build match scores
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
        title="Group Stage Predictions"
        description="Drag and drop teams to predict the final standings for each group"
      />

      <GroupSimulatorClient
        initialPlacements={initialPlacements}
        initialScores={initialScores}
        initialThirdPlaces={selectedThirdPlaces}
      />
    </div>
  );
}
