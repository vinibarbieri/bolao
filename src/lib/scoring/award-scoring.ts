import { db } from "@/db";
import { awardPredictions, actualAwards, goldenTrio } from "@/db/schema/predictions";
import { players } from "@/db/schema/matches";
import { eq } from "drizzle-orm";

const AWARD_POINTS: Record<string, number> = {
  golden_boot: 10,
  golden_glove: 8,
  top_assist: 8,
  goal_of_tournament: 5,
};

const TRIO_POINTS = {
  EXACT_MATCH: 10, // Player is in the top 3 scorers
  IN_TOP_5: 5, // Player is in the top 5 scorers (but not top 3)
};

export async function calculateAwardScores(userId: string) {
  const predictions = await db
    .select()
    .from(awardPredictions)
    .where(eq(awardPredictions.userId, userId));

  const actuals = await db.select().from(actualAwards);
  const actualsMap = new Map(actuals.map((a) => [a.awardType, a.playerId]));

  const scoreRows: {
    userId: string;
    category: "awards";
    subDetail: string;
    points: number;
    description: string;
  }[] = [];

  for (const pred of predictions) {
    if (!pred.playerId) continue;
    const actualPlayerId = actualsMap.get(pred.awardType);
    if (!actualPlayerId) continue;

    if (pred.playerId === actualPlayerId) {
      const pts = AWARD_POINTS[pred.awardType] ?? 0;
      scoreRows.push({
        userId,
        category: "awards",
        subDetail: pred.awardType,
        points: pts,
        description: `Correctly predicted ${formatAwardType(pred.awardType)}`,
      });
    }
  }

  return scoreRows;
}

export async function calculateTrioScores(
  userId: string,
  topScorerIds: string[] // ordered list of top scorer player IDs
) {
  const trio = await db
    .select()
    .from(goldenTrio)
    .where(eq(goldenTrio.userId, userId));

  const scoreRows: {
    userId: string;
    category: "golden_trio";
    subDetail: string;
    points: number;
    description: string;
  }[] = [];

  const top3 = new Set(topScorerIds.slice(0, 3));
  const top5 = new Set(topScorerIds.slice(0, 5));

  for (const pick of trio) {
    if (top3.has(pick.playerId)) {
      scoreRows.push({
        userId,
        category: "golden_trio",
        subDetail: `Slot ${pick.slot}`,
        points: TRIO_POINTS.EXACT_MATCH,
        description: `Golden Trio pick in top 3 scorers`,
      });
    } else if (top5.has(pick.playerId)) {
      scoreRows.push({
        userId,
        category: "golden_trio",
        subDetail: `Slot ${pick.slot}`,
        points: TRIO_POINTS.IN_TOP_5,
        description: `Golden Trio pick in top 5 scorers`,
      });
    }
  }

  return scoreRows;
}

function formatAwardType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
