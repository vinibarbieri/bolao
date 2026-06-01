import { requireAdmin } from "@/lib/supabase/auth";
import { getAllMatches, getAllPlayers, getAllTeams } from "../../queries";
import { MatchAdminClient } from "./matches-client";
import { PageHeader } from "@/components/page-header";
import { ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminMatchesPage() {
  await requireAdmin();
  const t = await getTranslations("AdminMatches");
  const [allMatches, allPlayers, allTeams] = await Promise.all([
    getAllMatches(),
    getAllPlayers(),
    getAllTeams(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ListChecks}
        title={t("title")}
        description={t("description")}
      />

      <MatchAdminClient
        matches={allMatches}
        players={allPlayers}
        teams={allTeams}
      />
    </div>
  );
}
