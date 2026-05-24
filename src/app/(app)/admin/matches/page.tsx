import { requireUser } from "@/lib/supabase/auth";
import { getAllMatches, getAllPlayers, getAllTeams } from "../../queries";
import { MatchAdminClient } from "./matches-client";

export default async function AdminMatchesPage() {
  const user = await requireUser();
  const [allMatches, allPlayers, allTeams] = await Promise.all([
    getAllMatches(),
    getAllPlayers(),
    getAllTeams(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Match Management</h1>
        <p className="text-muted-foreground">
          Enter match results and Man of the Match
        </p>
      </div>

      <MatchAdminClient
        matches={allMatches}
        players={allPlayers}
        teams={allTeams}
      />
    </div>
  );
}
