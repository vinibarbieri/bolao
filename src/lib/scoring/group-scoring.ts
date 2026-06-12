import { db } from "@/db";
import { groupPredictions } from "@/db/schema/predictions";
import { groupStandings } from "@/db/schema/teams";
import type { ScoreRow } from "./breakdown";
import { eq } from "drizzle-orm";

export const POINTS = {
  EXACT_POSITION: 3,
  CORRECT_ADVANCE: 2,
  CORRECT_THIRD_QUALIFIES: 2,
};

export async function calculateGroupScores(userId: string) {
  const predictions = await db
    .select()
    .from(groupPredictions)
    .where(eq(groupPredictions.userId, userId));

  const standings = await db.select().from(groupStandings);

  const standingsMap = new Map(standings.map((s) => [s.teamId, s]));
  const scoreRows: ScoreRow[] = [];

  for (const pred of predictions) {
    const actual = standingsMap.get(pred.teamId);
    if (!actual || actual.position === null) continue;

    // Exact position match
    if (pred.predictedPosition === actual.position) {
      scoreRows.push({
        userId,
        category: "group",
        subDetail: pred.groupLetter,
        points: POINTS.EXACT_POSITION,
        detail: {
          kind: "groupExact",
          team: pred.teamId,
          position: pred.predictedPosition,
          group: pred.groupLetter,
        },
      });
    }

    // Correct advance (top 2)
    if (pred.predictedPosition <= 2 && actual.position <= 2) {
      scoreRows.push({
        userId,
        category: "group",
        subDetail: pred.groupLetter,
        points: POINTS.CORRECT_ADVANCE,
        detail: {
          kind: "groupAdvance",
          team: pred.teamId,
          group: pred.groupLetter,
        },
      });
    }

    // 3rd place qualifies as best third
    if (
      pred.predictedPosition === 3 &&
      pred.advancesAsThird &&
      actual.position === 3 &&
      actual.isBestThird
    ) {
      scoreRows.push({
        userId,
        category: "group",
        subDetail: pred.groupLetter,
        points: POINTS.CORRECT_THIRD_QUALIFIES,
        detail: {
          kind: "groupThird",
          team: pred.teamId,
          group: pred.groupLetter,
        },
      });
    }
  }

  return scoreRows;
}
