import { db } from "@/db";
import { groupPredictions } from "@/db/schema/predictions";
import { groupStandings } from "@/db/schema/teams";
import { userScores } from "@/db/schema/scores";
import { eq } from "drizzle-orm";

const POINTS = {
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
  const scoreRows: {
    userId: string;
    category: "group";
    subDetail: string;
    points: number;
    description: string;
  }[] = [];

  for (const pred of predictions) {
    const actual = standingsMap.get(pred.teamId);
    if (!actual || actual.position === null) continue;

    // Exact position match
    if (pred.predictedPosition === actual.position) {
      scoreRows.push({
        userId,
        category: "group",
        subDetail: `Group ${pred.groupLetter}`,
        points: POINTS.EXACT_POSITION,
        description: `${pred.teamId} correctly placed ${pred.predictedPosition}${ordinal(pred.predictedPosition)} in Group ${pred.groupLetter}`,
      });
    }

    // Correct advance (top 2)
    if (pred.predictedPosition <= 2 && actual.position <= 2) {
      scoreRows.push({
        userId,
        category: "group",
        subDetail: `Group ${pred.groupLetter}`,
        points: POINTS.CORRECT_ADVANCE,
        description: `${pred.teamId} correctly predicted to advance from Group ${pred.groupLetter}`,
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
        subDetail: `Group ${pred.groupLetter}`,
        points: POINTS.CORRECT_THIRD_QUALIFIES,
        description: `${pred.teamId} correctly predicted as qualifying 3rd-place team from Group ${pred.groupLetter}`,
      });
    }
  }

  return scoreRows;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
