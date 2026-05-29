import { requireUser } from "@/lib/supabase/auth";
import { getUserGoldenTrio, getAllPlayers } from "../../queries";
import { GoldenTrioClient } from "./trio-client";
import { PageHeader } from "@/components/page-header";
import { Star } from "lucide-react";

export default async function GoldenTrioPage() {
  const user = await requireUser();
  const [trio, players] = await Promise.all([
    getUserGoldenTrio(user.id),
    getAllPlayers(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Star}
        title="Golden Trio"
        description="Pick 3 players you think will be the greatest of the tournament"
      />

      <GoldenTrioClient existingTrio={trio} players={players} />
    </div>
  );
}
