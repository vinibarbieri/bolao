import { requireUser } from "@/lib/supabase/auth";
import { getUserAwardPredictions, getAllPlayers } from "../../queries";
import { AwardsPredictionClient } from "./awards-client";
import { PageHeader } from "@/components/page-header";
import { Award } from "lucide-react";

export default async function AwardsPage() {
  const user = await requireUser();
  const [predictions, players] = await Promise.all([
    getUserAwardPredictions(user.id),
    getAllPlayers(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Award}
        title="Award Predictions"
        description="Predict the individual award winners"
      />

      <AwardsPredictionClient
        existingPredictions={predictions}
        players={players}
      />
    </div>
  );
}
