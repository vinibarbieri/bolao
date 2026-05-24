import { requireUser } from "@/lib/supabase/auth";
import {
  getUserGroupPredictions,
  getUserBracketPicks,
  getTeamsByGroup,
} from "../queries";
import { BracketBuilderClient } from "@/components/bracket/bracket-builder-client";

export default async function BracketPage() {
  const user = await requireUser();

  const [predictions, bracketPicks, teamsByGroup] = await Promise.all([
    getUserGroupPredictions(user.id),
    getUserBracketPicks(user.id),
    getTeamsByGroup(),
  ]);

  // Check if 3rd place selection is complete
  const thirdPlaceTeams = predictions.filter(
    (p) => p.predictedPosition === 3 && p.advancesAsThird
  );
  const isReady = thirdPlaceTeams.length === 8;

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
      <div>
        <h1 className="text-3xl font-bold">Knockout Bracket</h1>
        <p className="text-muted-foreground">
          Click on teams to advance them through the bracket
        </p>
      </div>

      {!isReady ? (
        <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-6 dark:bg-yellow-950">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            Complete your 3rd-place selection first (need 8 teams selected).
          </p>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            Currently selected: {thirdPlaceTeams.length}/8
          </p>
        </div>
      ) : (
        <BracketBuilderClient
          r32Teams={r32Teams}
          existingPicks={existingPicks}
        />
      )}
    </div>
  );
}
