import { requireUser } from "@/lib/supabase/auth";
import { getUserGroupPredictions, getTeamsByGroup } from "../queries";
import { ThirdPlaceSelectorClient } from "@/components/third-place/third-place-selector-client";
import { PageHeader } from "@/components/page-header";
import { Medal, AlertTriangle } from "lucide-react";

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
      <PageHeader
        icon={Medal}
        title="3rd Place Selection"
        description="Select exactly 8 of the 12 third-place teams you think will qualify for the Round of 32"
      />

      {!hasAllGroups ? (
        <div className="flex items-start gap-3 rounded-xl border border-third/50 bg-third/10 p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-third-foreground" />
          <div>
            <p className="font-medium text-third-foreground">
              Complete all 12 group predictions first before selecting 3rd-place
              qualifiers.
            </p>
            <p className="mt-1 text-sm text-third-foreground/80">
              You have {thirdPlaceTeams.length}/12 groups completed.
            </p>
          </div>
        </div>
      ) : (
        <ThirdPlaceSelectorClient teams={thirdPlaceTeams} />
      )}
    </div>
  );
}
