import { requireUser } from "@/lib/supabase/auth";
import { getUserLeagues } from "../queries";
import { LeaguesClient } from "./leagues-client";
import { PageHeader } from "@/components/page-header";
import { Users } from "lucide-react";

export default async function LeaguesPage() {
  const user = await requireUser();
  const leagues = await getUserLeagues(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Leagues"
        description="Create or join leagues to compete with friends"
      />

      <LeaguesClient leagues={leagues} />
    </div>
  );
}
