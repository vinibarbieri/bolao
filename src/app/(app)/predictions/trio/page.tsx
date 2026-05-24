import { requireUser } from "@/lib/supabase/auth";
import { getUserGoldenTrio, getAllPlayers } from "../../queries";
import { GoldenTrioClient } from "./trio-client";

export default async function GoldenTrioPage() {
  const user = await requireUser();
  const [trio, players] = await Promise.all([
    getUserGoldenTrio(user.id),
    getAllPlayers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Golden Trio</h1>
        <p className="text-muted-foreground">
          Pick 3 players you think will be the top scorers of the tournament
        </p>
      </div>

      <GoldenTrioClient existingTrio={trio} players={players} />
    </div>
  );
}
