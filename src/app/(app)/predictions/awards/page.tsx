import { requireUser } from "@/lib/supabase/auth";
import { getUserAwardPredictions, getAllPlayers, getUserScoreBreakdown } from "../../queries";
import { AwardsPredictionClient } from "./awards-client";
import { PageHeader } from "@/components/page-header";
import { AWARD_POINTS } from "@/lib/scoring/award-scoring";
import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AwardsPage() {
  const user = await requireUser();
  const t = await getTranslations("Awards");

  const [predictions, players, scoreBreakdown] = await Promise.all([
    getUserAwardPredictions(user.id),
    getAllPlayers(),
    getUserScoreBreakdown(user.id),
  ]);

  const awardPointsMap: Record<string, number> = {};
  for (const row of scoreBreakdown.filter((r) => r.category === "awards")) {
    if (row.subDetail) awardPointsMap[row.subDetail] = row.points;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Award}
        title={t("title")}
        description={t("description")}
      />

      <AwardsPredictionClient
        existingPredictions={predictions}
        players={players}
        earnedPointsMap={awardPointsMap}
        awardPointsConfig={AWARD_POINTS}
      />
    </div>
  );
}
