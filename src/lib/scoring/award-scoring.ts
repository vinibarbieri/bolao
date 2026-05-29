import { db } from "@/db";
import { awardPredictions, actualAwards, goldenTrio } from "@/db/schema/predictions";
import { matches } from "@/db/schema/matches";
import { eq, and, isNotNull } from "drizzle-orm";

export const TRIO_MOTM_POINTS = 2;

export const AWARD_POINTS: Record<string, number> = {
  golden_boot: 10,
  golden_glove: 5,
  top_assist: 5,
  goal_of_tournament: 5,
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

export async function calculateTrioScores(userId: string) {
  const trio = await db
    .select()
    .from(goldenTrio)
    .where(eq(goldenTrio.userId, userId));

  if (trio.length === 0) return [];

  // Count MOTM wins per player from finished matches
  const motmMatches = await db
    .select({ motmPlayerId: matches.motmPlayerId })
    .from(matches)
    .where(and(eq(matches.status, "finished"), isNotNull(matches.motmPlayerId)));

  const motmCounts = new Map<string, number>();
  for (const m of motmMatches) {
    if (!m.motmPlayerId) continue;
    motmCounts.set(m.motmPlayerId, (motmCounts.get(m.motmPlayerId) ?? 0) + 1);
  }

  const scoreRows: {
    userId: string;
    category: "golden_trio";
    subDetail: string;
    points: number;
    description: string;
  }[] = [];

  for (const pick of trio) {
    const count = motmCounts.get(pick.playerId) ?? 0;
    if (count > 0) {
      scoreRows.push({
        userId,
        category: "golden_trio",
        subDetail: `Slot ${pick.slot}`,
        points: count * TRIO_MOTM_POINTS,
        description: `Golden Trio pick won ${count} MOTM award${count > 1 ? "s" : ""} (${count * TRIO_MOTM_POINTS} pts)`,
      });
    }
  }

  return scoreRows;
}

function formatAwardType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
