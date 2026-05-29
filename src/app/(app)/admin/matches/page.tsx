import { requireUser } from "@/lib/supabase/auth";
import { getAllMatches, getAllPlayers, getAllTeams } from "../../queries";
import { MatchAdminClient } from "./matches-client";
import { PageHeader } from "@/components/page-header";
import { ListChecks } from "lucide-react";

export default async function AdminMatchesPage() {
  const user = await requireUser();
  const [allMatches, allPlayers, allTeams] = await Promise.all([
    getAllMatches(),
    getAllPlayers(),
    getAllTeams(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ListChecks}
        title="Match Management"
        description="Enter match results and Man of the Match"
      />

      <MatchAdminClient
        matches={allMatches}
        players={allPlayers}
        teams={allTeams}
      />
    </div>
  );
}
