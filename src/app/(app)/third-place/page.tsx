import { requireUser } from "@/lib/supabase/auth";
import { getUserGroupPredictions, getTeamsByGroup } from "../queries";
import { ThirdPlaceSelectorClient } from "@/components/third-place/third-place-selector-client";

export default async function ThirdPlacePage() {
  const user = await requireUser();
  const [predictions, teamsByGroup] = await Promise.all([
    getUserGroupPredictions(user.id),
    getTeamsByGroup(),
  ]);

  // Get all teams predicted as 3rd place
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
      <div>
        <h1 className="text-3xl font-bold">3rd Place Selection</h1>
        <p className="text-muted-foreground">
          Select exactly 8 of the 12 third-place teams you think will qualify
          for the Round of 32
        </p>
      </div>

      {!hasAllGroups ? (
        <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-6 dark:bg-yellow-950">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            Complete all 12 group predictions first before selecting 3rd-place
            qualifiers.
          </p>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            You have {thirdPlaceTeams.length}/12 groups completed.
          </p>
        </div>
      ) : (
        <ThirdPlaceSelectorClient teams={thirdPlaceTeams} />
      )}
    </div>
  );
}
