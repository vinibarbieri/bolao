import { requireUser } from "@/lib/supabase/auth";
import { getUserAwardPredictions, getAllPlayers } from "../../queries";
import { AwardsPredictionClient } from "./awards-client";

export default async function AwardsPage() {
  const user = await requireUser();
  const [predictions, players] = await Promise.all([
    getUserAwardPredictions(user.id),
    getAllPlayers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Award Predictions</h1>
        <p className="text-muted-foreground">
          Predict the individual award winners
        </p>
      </div>

      <AwardsPredictionClient
        existingPredictions={predictions}
        players={players}
      />
    </div>
  );
}
