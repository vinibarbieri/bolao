import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * End-to-end pipeline check for the results flow, runnable before the
 * tournament has any real finished matches.
 *
 * Picks one group, writes plausible final scores to its matches, then runs the
 * exact same recalc functions the cron sync calls (standings -> best thirds ->
 * all scores) and prints the resulting standings + leaderboard.
 *
 * By default it REVERTS afterwards: matches are restored to their pre-run state
 * and the derived tables are recomputed, leaving the DB as it was. Pass --keep
 * to leave the simulated results in place for manual inspection.
 *
 *   npx tsx src/db/seed/simulate-results.ts            # group A, auto-revert
 *   npx tsx src/db/seed/simulate-results.ts B          # group B
 *   npx tsx src/db/seed/simulate-results.ts A --keep   # leave data in place
 */

// Deterministic scorelines applied to a group's matches in kickoff order.
// Mix of wins/draws so positions and best-third logic actually differ.
const SCORELINES: Array<[number, number]> = [
  [2, 0],
  [1, 1],
  [3, 1],
  [0, 0],
  [2, 1],
  [1, 0],
];

async function main() {
  const args = process.argv.slice(2);
  const keep = args.includes("--keep");
  const groupLetter = (args.find((a) => !a.startsWith("--")) ?? "A").toUpperCase();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  // Dynamic import so dotenv populates env before the db client (which reads
  // DATABASE_URL at module load) is initialized.
  const { db } = await import("@/db");
  const { matches } = await import("@/db/schema/matches");
  const { groupStandings, teams } = await import("@/db/schema/teams");
  const { leaderboardCache } = await import("@/db/schema/scores");
  const { updateGroupStandings, recalculateBestThirds } = await import(
    "@/lib/scoring/group-standings"
  );
  const { recalculateAllScores } = await import("@/lib/scoring/recalculate");
  const { eq, and, asc } = await import("drizzle-orm");

  const groupMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.groupLetter, groupLetter)))
    .orderBy(asc(matches.matchNumber));

  if (groupMatches.length === 0) {
    console.error(`No group matches found for group ${groupLetter}.`);
    process.exit(1);
  }

  // Snapshot the exact fields we mutate so we can restore them.
  const snapshot = groupMatches.map((m) => ({
    id: m.id,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    winnerTeamId: m.winnerTeamId,
    status: m.status,
  }));

  console.log(
    `\nSimulating ${groupMatches.length} results for group ${groupLetter}` +
      (keep ? " (--keep: will NOT revert)\n" : " (auto-revert after)\n")
  );

  // Apply fake finished results.
  for (let i = 0; i < groupMatches.length; i++) {
    const m = groupMatches[i];
    const [home, away] = SCORELINES[i % SCORELINES.length];
    const winnerTeamId =
      home > away ? m.homeTeamId : away > home ? m.awayTeamId : null;
    await db
      .update(matches)
      .set({
        homeScore: home,
        awayScore: away,
        winnerTeamId,
        status: "finished",
      })
      .where(eq(matches.id, m.id));
  }

  // Run the real pipeline (same calls as the cron sync).
  await updateGroupStandings(groupLetter);
  await recalculateBestThirds();
  await recalculateAllScores();

  // Report standings for this group.
  const standings = await db
    .select({
      teamId: groupStandings.teamId,
      name: teams.name,
      position: groupStandings.position,
      played: groupStandings.played,
      won: groupStandings.won,
      drawn: groupStandings.drawn,
      lost: groupStandings.lost,
      gd: groupStandings.gd,
      points: groupStandings.points,
      isBestThird: groupStandings.isBestThird,
    })
    .from(groupStandings)
    .leftJoin(teams, eq(groupStandings.teamId, teams.id))
    .where(eq(groupStandings.groupLetter, groupLetter))
    .orderBy(asc(groupStandings.position));

  console.log(`Group ${groupLetter} standings:`);
  console.table(
    standings.map((s) => ({
      pos: s.position,
      team: s.name,
      P: s.played,
      W: s.won,
      D: s.drawn,
      L: s.lost,
      GD: s.gd,
      Pts: s.points,
      best3rd: s.isBestThird,
    }))
  );

  // Report leaderboard (proves scores were written + ranked).
  const board = await db
    .select()
    .from(leaderboardCache)
    .orderBy(asc(leaderboardCache.rank))
    .limit(10);

  console.log(`Leaderboard (${board.length} rows, top 10):`);
  console.table(
    board.map((r) => ({
      rank: r.rank,
      user: r.userId.slice(0, 8),
      league: r.leagueId.slice(0, 8),
      total: r.totalPoints,
      group: r.groupPoints,
    }))
  );

  if (board.length === 0) {
    console.warn(
      "No leaderboard rows. Expected if there are no users/predictions/leagues yet.\n" +
        "Standings above still prove the match-write + standings pipeline works."
    );
  }

  // Revert unless --keep.
  if (!keep) {
    for (const s of snapshot) {
      await db
        .update(matches)
        .set({
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          winnerTeamId: s.winnerTeamId,
          status: s.status,
        })
        .where(eq(matches.id, s.id));
    }
    // Rebuild derived tables from the (now restored) match data.
    await updateGroupStandings(groupLetter);
    await recalculateBestThirds();
    await recalculateAllScores();
    console.log(`\nReverted group ${groupLetter}. DB restored to pre-run state.`);
  } else {
    console.log(
      `\nKept simulated results for group ${groupLetter}. ` +
        `Re-run without --keep to clean up.`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Simulation failed:", err);
    process.exit(1);
  });
