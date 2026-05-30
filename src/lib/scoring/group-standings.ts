import { db } from "@/db";
import { matches } from "@/db/schema/matches";
import { groupStandings } from "@/db/schema/teams";
import { eq, and, asc } from "drizzle-orm";
import { computeStandings, selectBestThirds } from "./standings-compute";

// Rebuilds group standings for a single group from all of its finished matches.
export async function updateGroupStandings(groupLetter: string) {
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

  const sorted = computeStandings(groupMatches);

  for (const s of sorted) {
    await db
      .update(groupStandings)
      .set({
        position: s.position,
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

// Re-ranks all third-place teams and marks the best 8 as isBestThird.
// Called after every group match result is entered.
export async function recalculateBestThirds() {
  const thirds = await db
    .select()
    .from(groupStandings)
    .where(eq(groupStandings.position, 3))
    .orderBy(asc(groupStandings.points));

  const best8 = selectBestThirds(thirds);

  for (const team of thirds) {
    await db
      .update(groupStandings)
      .set({ isBestThird: best8.has(team.teamId) })
      .where(eq(groupStandings.teamId, team.teamId));
  }
}
