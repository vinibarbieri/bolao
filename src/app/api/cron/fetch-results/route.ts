import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema/matches";
import { eq, and } from "drizzle-orm";
import { recalculateAllScores } from "@/lib/scoring/recalculate";
import {
  updateGroupStandings,
  recalculateBestThirds,
} from "@/lib/scoring/group-standings";
import { resolveWinner } from "@/lib/tournament/winner";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";

interface FootballDataMatch {
  id: number;
  status: string;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
}

export async function GET(request: Request) {
  // Verify cron secret for Vercel cron jobs
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Fetch World Cup 2026 matches (competition ID TBD, using placeholder)
    const res = await fetch(`${FOOTBALL_DATA_API}/competitions/WC/matches`, {
      headers: { "X-Auth-Token": apiKey },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API error: ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const apiMatches: FootballDataMatch[] = data.matches ?? [];

    let updated = 0;

    for (const apiMatch of apiMatches) {
      if (apiMatch.status !== "FINISHED") continue;

      const homeScore = apiMatch.score.fullTime.home;
      const awayScore = apiMatch.score.fullTime.away;

      if (homeScore === null || awayScore === null) continue;

      // Find matching local match by external API ID
      const localMatch = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.externalApiId, String(apiMatch.id)),
            eq(matches.status, "scheduled")
          )
        )
        .limit(1);

      if (localMatch.length === 0) continue;

      const local = localMatch[0];
      const isGroup = local.stage === "group";

      // For a level knockout match, the API `score.winner` decides who advanced.
      const advancingTeamId =
        apiMatch.score.winner === "HOME_TEAM"
          ? local.homeTeamId
          : apiMatch.score.winner === "AWAY_TEAM"
            ? local.awayTeamId
            : null;

      const winnerTeamId = resolveWinner({
        homeScore,
        awayScore,
        isGroup,
        homeTeamId: local.homeTeamId,
        awayTeamId: local.awayTeamId,
        advancingTeamId,
      });

      await db
        .update(matches)
        .set({
          homeScore,
          awayScore,
          winnerTeamId,
          status: "finished",
        })
        .where(eq(matches.id, local.id));

      // Recompute group standings + best-third rankings for finished group matches.
      if (local.stage === "group" && local.homeTeamId && local.awayTeamId) {
        await updateGroupStandings(local.groupLetter!);
        await recalculateBestThirds();
      }

      updated++;
    }

    if (updated > 0) {
      await recalculateAllScores();
    }

    return NextResponse.json({ success: true, updatedMatches: updated });
  } catch (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
