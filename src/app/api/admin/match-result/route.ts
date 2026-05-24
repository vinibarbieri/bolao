import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema/matches";
import { groupStandings } from "@/db/schema/teams";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, homeScore, awayScore } = await request.json();

  if (typeof homeScore !== "number" || typeof awayScore !== "number") {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }

  const match = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (match.length === 0) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const winnerTeamId =
    homeScore > awayScore
      ? match[0].homeTeamId
      : awayScore > homeScore
        ? match[0].awayTeamId
        : null;

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      winnerTeamId,
      status: "finished",
    })
    .where(eq(matches.id, matchId));

  // If it's a group match, update group standings
  if (match[0].stage === "group" && match[0].homeTeamId && match[0].awayTeamId) {
    await updateGroupStandings(
      match[0].homeTeamId,
      match[0].awayTeamId,
      homeScore,
      awayScore,
      match[0].groupLetter!
    );
  }

  return NextResponse.json({ success: true });
}

async function updateGroupStandings(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  groupLetter: string
) {
  // Get all finished matches for this group to recompute standings
  const groupMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.stage, "group"),
        eq(matches.groupLetter, groupLetter),
        eq(matches.status, "finished")
      )
    );

  // Build standings from scratch
  const stats: Record<
    string,
    {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      gf: number;
      ga: number;
    }
  > = {};

  for (const m of groupMatches) {
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null)
      continue;

    for (const teamId of [m.homeTeamId, m.awayTeamId]) {
      if (!stats[teamId]) {
        stats[teamId] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      }
    }

    stats[m.homeTeamId].played++;
    stats[m.awayTeamId].played++;
    stats[m.homeTeamId].gf += m.homeScore;
    stats[m.homeTeamId].ga += m.awayScore;
    stats[m.awayTeamId].gf += m.awayScore;
    stats[m.awayTeamId].ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      stats[m.homeTeamId].won++;
      stats[m.awayTeamId].lost++;
    } else if (m.awayScore > m.homeScore) {
      stats[m.awayTeamId].won++;
      stats[m.homeTeamId].lost++;
    } else {
      stats[m.homeTeamId].drawn++;
      stats[m.awayTeamId].drawn++;
    }
  }

  // Sort and assign positions
  const sorted = Object.entries(stats)
    .map(([teamId, s]) => ({
      teamId,
      ...s,
      gd: s.gf - s.ga,
      points: s.won * 3 + s.drawn,
    }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    await db
      .update(groupStandings)
      .set({
        position: i + 1,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        gf: s.gf,
        ga: s.ga,
        gd: s.gd,
        points: s.points,
      })
      .where(eq(groupStandings.teamId, s.teamId));
  }
}
