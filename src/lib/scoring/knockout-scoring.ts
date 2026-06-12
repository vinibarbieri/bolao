import { db } from "@/db";
import { knockoutPredictions } from "@/db/schema/predictions";
import { matches } from "@/db/schema/matches";
import type { ScoreRow } from "./breakdown";
import { eq, and, ne } from "drizzle-orm";

export const POINTS: Record<string, number> = {
  r16: 5,
  qf: 8,
  sf: 15,
  third: 20,
  final: 30,
  champion: 50,
};

export async function calculateKnockoutScores(userId: string) {
  const predictions = await db
    .select()
    .from(knockoutPredictions)
    .where(eq(knockoutPredictions.userId, userId));

  // Get all finished knockout matches to determine which teams actually reached each round
  const finishedMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        ne(matches.stage, "group"),
        eq(matches.status, "finished")
      )
    );

  // Build actual results: which teams reached which rounds
  const actualTeamRounds = new Map<string, Set<string>>();

  for (const match of finishedMatches) {
    // Both teams that played in this match "reached" this round
    for (const teamId of [match.homeTeamId, match.awayTeamId]) {
      if (!teamId) continue;
      if (!actualTeamRounds.has(teamId)) {
        actualTeamRounds.set(teamId, new Set());
      }
      actualTeamRounds.get(teamId)!.add(match.stage);
    }

    // The winner also "reached" the next round
    if (match.winnerTeamId) {
      if (!actualTeamRounds.has(match.winnerTeamId)) {
        actualTeamRounds.set(match.winnerTeamId, new Set());
      }

      const nextRound = getNextRound(match.stage);
      if (nextRound) {
        actualTeamRounds.get(match.winnerTeamId)!.add(nextRound);
      }
    }
  }

  const scoreRows: ScoreRow[] = [];

  for (const pred of predictions) {
    const actualRounds = actualTeamRounds.get(pred.teamId);
    if (!actualRounds || !actualRounds.has(pred.round)) continue;

    const pts = POINTS[pred.round] ?? 0;
    if (pts > 0) {
      scoreRows.push({
        userId,
        category: "knockout",
        subDetail: pred.round,
        points: pts,
        detail: {
          kind: "knockoutReach",
          team: pred.teamId,
          round: pred.round,
        },
      });
    }
  }

  return scoreRows;
}

function getNextRound(currentRound: string): string | null {
  const progression: Record<string, string> = {
    r32: "r16",
    r16: "qf",
    qf: "sf",
    sf: "final",
    final: "champion",
  };
  return progression[currentRound] ?? null;
}
