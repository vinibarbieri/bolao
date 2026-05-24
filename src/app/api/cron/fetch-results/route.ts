import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema/matches";
import { eq, and } from "drizzle-orm";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";

interface FootballDataMatch {
  id: number;
  status: string;
  score: {
    fullTime: { home: number | null; away: number | null };
    penalties: { home: number | null; away: number | null };
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

      const winnerTeamId =
        homeScore > awayScore
          ? localMatch[0].homeTeamId
          : awayScore > homeScore
            ? localMatch[0].awayTeamId
            : null;

      await db
        .update(matches)
        .set({
          homeScore,
          awayScore,
          homePenalties: apiMatch.score.penalties.home,
          awayPenalties: apiMatch.score.penalties.away,
          winnerTeamId,
          status: "finished",
        })
        .where(eq(matches.id, localMatch[0].id));

      updated++;
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
