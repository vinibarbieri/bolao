import { requireUser } from "@/lib/supabase/auth";
import {
  getUserGroupPredictions,
  getUserBracketPicks,
  getTeamsByGroup,
  getUserScoreBreakdown,
} from "../queries";
import { BracketBuilderClient } from "@/components/bracket/bracket-builder-client";
import { getThirdPlaceAssignments, type GroupLetter } from "@/lib/tournament/third-place-lookup";
import { resolveR32Matchups } from "@/lib/tournament/bracket-mapping";
import { PageHeader } from "@/components/page-header";
import { Trophy, AlertTriangle } from "lucide-react";

export default async function BracketPage() {
  const user = await requireUser();

  const [predictions, bracketPicks, teamsByGroup, scoreBreakdown] = await Promise.all([
    getUserGroupPredictions(user.id),
    getUserBracketPicks(user.id),
    getTeamsByGroup(),
    getUserScoreBreakdown(user.id),
  ]);

  const knockoutRoundPoints: Record<string, number> = {};
  for (const row of scoreBreakdown.filter((r) => r.category === "knockout")) {
    const round = row.subDetail?.toLowerCase() ?? "";
    knockoutRoundPoints[round] = (knockoutRoundPoints[round] ?? 0) + row.points;
  }

  // Check if 3rd place selection is complete
  const thirdPlaceTeams = predictions.filter(
    (p) => p.predictedPosition === 3 && p.advancesAsThird
  );
  const isReady = thirdPlaceTeams.length === 8;

  // Resolve R32 matchups with actual group letters for 3rd-place slots
  const qualifyingGroups = thirdPlaceTeams.map((p) => p.groupLetter as GroupLetter);
  const resolvedMatchups = isReady
    ? resolveR32Matchups(getThirdPlaceAssignments(qualifyingGroups).assignments)
    : [];

  // Build team name map
  const allTeams = Object.values(teamsByGroup).flat();
  const teamNameMap: Record<string, string> = {};
  for (const team of allTeams) {
    teamNameMap[team.id] = team.name;
  }

  // Build R32 participants from predictions
  const r32Teams: {
    teamId: string;
    teamName: string;
    source: string; // e.g., "1A", "2A", "3A"
  }[] = [];

  if (isReady) {
    for (const pred of predictions) {
      if (pred.predictedPosition === 1) {
        r32Teams.push({
          teamId: pred.teamId,
          teamName: teamNameMap[pred.teamId] ?? pred.teamId,
          source: `1${pred.groupLetter}`,
        });
      } else if (pred.predictedPosition === 2) {
        r32Teams.push({
          teamId: pred.teamId,
          teamName: teamNameMap[pred.teamId] ?? pred.teamId,
          source: `2${pred.groupLetter}`,
        });
      } else if (pred.predictedPosition === 3 && pred.advancesAsThird) {
        r32Teams.push({
          teamId: pred.teamId,
          teamName: teamNameMap[pred.teamId] ?? pred.teamId,
          source: `3${pred.groupLetter}`,
        });
      }
    }
  }

  // Build existing picks map
  const existingPicks: Record<number, { teamId: string; teamName: string }> = {};
  for (const pick of bracketPicks) {
    existingPicks[pick.bracketSlot] = {
      teamId: pick.teamId,
      teamName: teamNameMap[pick.teamId] ?? pick.teamId,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Trophy}
        title="Knockout Bracket"
        description="Click on a team to advance them through each round to the final"
      />

      {!isReady ? (
        <div className="flex items-start gap-3 rounded-xl border border-third/50 bg-third/10 p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-third-foreground" />
          <div>
            <p className="font-medium text-third-foreground">
              Complete your 3rd-place selection first (need 8 teams selected).
            </p>
            <p className="mt-1 text-sm text-third-foreground/80">
              Currently selected: {thirdPlaceTeams.length}/8
            </p>
          </div>
        </div>
      ) : (
        <BracketBuilderClient
          r32Teams={r32Teams}
          existingPicks={existingPicks}
          resolvedMatchups={resolvedMatchups}
          knockoutRoundPoints={knockoutRoundPoints}
        />
      )}
    </div>
  );
}
