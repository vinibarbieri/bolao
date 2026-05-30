import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches } from "@/db/schema/matches";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/supabase/auth";
import { recalculateAllScores } from "@/lib/scoring/recalculate";
import {
  updateGroupStandings,
  recalculateBestThirds,
} from "@/lib/scoring/group-standings";
import { resolveWinner } from "@/lib/tournament/winner";

export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, homeScore, awayScore, motmPlayerId, winnerTeamId: winnerOverride } =
    await request.json();

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

  const isGroup = match[0].stage === "group";

  // Knockout match level at full time — the advancing team must be supplied.
  if (
    !isGroup &&
    homeScore === awayScore &&
    winnerOverride !== match[0].homeTeamId &&
    winnerOverride !== match[0].awayTeamId
  ) {
    return NextResponse.json(
      { error: "winnerTeamId must be one of the match participants" },
      { status: 400 }
    );
  }

  const winnerTeamId = resolveWinner({
    homeScore,
    awayScore,
    isGroup,
    homeTeamId: match[0].homeTeamId,
    awayTeamId: match[0].awayTeamId,
    advancingTeamId: winnerOverride,
  });

  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      winnerTeamId,
      motmPlayerId: motmPlayerId ?? null,
      status: "finished",
    })
    .where(eq(matches.id, matchId));

  // If it's a group match, update group standings and best-third rankings
  if (match[0].stage === "group" && match[0].homeTeamId && match[0].awayTeamId) {
    await updateGroupStandings(match[0].groupLetter!);
    await recalculateBestThirds();
  }

  await recalculateAllScores();

  return NextResponse.json({ success: true });
}
