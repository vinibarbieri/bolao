import { db } from "@/db";
import { knockoutPredictions } from "@/db/schema/predictions";
import { matches } from "@/db/schema/matches";
import { eq, and, ne } from "drizzle-orm";

const POINTS: Record<string, number> = {
  r32: 2,
  r16: 3,
  qf: 5,
  sf: 8,
  third: 5,
  final: 10,
  champion: 15,
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

  const scoreRows: {
    userId: string;
    category: "knockout";
    subDetail: string;
    points: number;
    description: string;
  }[] = [];

  for (const pred of predictions) {
    const actualRounds = actualTeamRounds.get(pred.teamId);
    if (!actualRounds || !actualRounds.has(pred.round)) continue;

    const pts = POINTS[pred.round] ?? 0;
    if (pts > 0) {
      scoreRows.push({
        userId,
        category: "knockout",
        subDetail: pred.round.toUpperCase(),
        points: pts,
        description: `${pred.teamId} correctly predicted to reach ${roundLabel(pred.round)}`,
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
    sf: "final", // or "third" for losers
  };
  return progression[currentRound] ?? null;
}

function roundLabel(round: string): string {
  const labels: Record<string, string> = {
    r32: "Round of 32",
    r16: "Round of 16",
    qf: "Quarter-Finals",
    sf: "Semi-Finals",
    third: "3rd Place Match",
    final: "Final",
    champion: "Champion",
  };
  return labels[round] ?? round;
}
