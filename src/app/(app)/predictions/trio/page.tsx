import { requireUser } from "@/lib/supabase/auth";
import { getUserGoldenTrio, getAllPlayers, getUserScoreBreakdown, getTournamentConfig } from "../../queries";
import { GoldenTrioClient } from "./trio-client";
import { PageHeader } from "@/components/page-header";
import { LockedBanner } from "@/components/locked-banner";
import { ScoringGuide } from "@/components/scoring-guide";
import { TRIO_MOTM_POINTS } from "@/lib/scoring/award-scoring";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function GoldenTrioPage() {
  const user = await requireUser();
  const t = await getTranslations("GoldenTrio");

  const [trio, players, scoreBreakdown, config] = await Promise.all([
    getUserGoldenTrio(user.id),
    getAllPlayers(),
    getUserScoreBreakdown(user.id),
    getTournamentConfig(),
  ]);
  const locked = config?.isLocked ?? false;

  const trioSlotPoints: Record<number, number> = {};
  for (const row of scoreBreakdown.filter((r) => r.category === "golden_trio")) {
    const slot = parseInt(row.subDetail?.split(" ")[1] ?? "0");
    if (slot >= 1 && slot <= 3) trioSlotPoints[slot] = row.points;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Star}
        title={t("title")}
        description={t("description")}
      />

      <ScoringGuide items={[{ label: t("perMotm"), points: TRIO_MOTM_POINTS }]} />

      {locked && <LockedBanner />}

      <GoldenTrioClient existingTrio={trio} players={players} slotPoints={trioSlotPoints} locked={locked} />
    </div>
  );
}
