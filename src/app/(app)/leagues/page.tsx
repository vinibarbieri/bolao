import { requireUser } from "@/lib/supabase/auth";
import { getUserLeagues } from "../queries";
import { LeaguesClient } from "./leagues-client";

export default async function LeaguesPage() {
  const user = await requireUser();
  const leagues = await getUserLeagues(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leagues</h1>
        <p className="text-muted-foreground">
          Create or join leagues to compete with friends
        </p>
      </div>

      <LeaguesClient leagues={leagues} />
    </div>
  );
}
