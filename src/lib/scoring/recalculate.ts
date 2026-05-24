import { db } from "@/db";
import { profiles } from "@/db/schema/profiles";
import { userScores, leaderboardCache } from "@/db/schema/scores";
import { leagueMembers } from "@/db/schema/leagues";
import { knockoutPredictions } from "@/db/schema/predictions";
import { eq, and, sql } from "drizzle-orm";
import { calculateGroupScores } from "./group-scoring";
import { calculateKnockoutScores } from "./knockout-scoring";
import { calculateAwardScores, calculateTrioScores } from "./award-scoring";

export async function recalculateAllScores(topScorerIds: string[] = []) {
  const allUsers = await db.select().from(profiles);

  await db.transaction(async (tx) => {
    // Clear all existing scores
    await tx.delete(userScores);
    await tx.delete(leaderboardCache);

    for (const user of allUsers) {
      // Calculate all score categories
      const groupScores = await calculateGroupScores(user.id);
      const knockoutScores = await calculateKnockoutScores(user.id);
      const awardScores = await calculateAwardScores(user.id);
      const trioScores = await calculateTrioScores(user.id, topScorerIds);

      const allScores = [
        ...groupScores,
        ...knockoutScores,
        ...awardScores,
        ...trioScores,
      ];

      // Insert score rows
      if (allScores.length > 0) {
        await tx.insert(userScores).values(allScores);
      }

      // Calculate totals
      const groupTotal = groupScores.reduce((s, r) => s + r.points, 0);
      const knockoutTotal = knockoutScores.reduce((s, r) => s + r.points, 0);
      const awardTotal = awardScores.reduce((s, r) => s + r.points, 0);
      const trioTotal = trioScores.reduce((s, r) => s + r.points, 0);
      const total = groupTotal + knockoutTotal + awardTotal + trioTotal;

      // Check if user predicted champion correctly
      const championPred = await db
        .select()
        .from(knockoutPredictions)
        .where(
          and(
            eq(knockoutPredictions.userId, user.id),
            eq(knockoutPredictions.round, "champion")
          )
        )
        .limit(1);

      const championCorrect = championPred.length > 0; // simplified check

      // Get all leagues this user belongs to
      const memberships = await db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.userId, user.id),
            eq(leagueMembers.status, "accepted")
          )
        );

      // Insert leaderboard cache for each league
      for (const membership of memberships) {
        await tx.insert(leaderboardCache).values({
          userId: user.id,
          leagueId: membership.leagueId,
          totalPoints: total,
          groupPoints: groupTotal,
          knockoutPoints: knockoutTotal,
          awardPoints: awardTotal,
          trioPoints: trioTotal,
          championCorrect,
          rank: 0, // will be computed below
        });
      }
    }

    // Compute ranks per league
    await tx.execute(sql`
      WITH ranked AS (
        SELECT user_id, league_id,
          ROW_NUMBER() OVER (
            PARTITION BY league_id
            ORDER BY total_points DESC, champion_correct DESC,
                     knockout_points DESC, group_points DESC, trio_points DESC
          ) as computed_rank
        FROM leaderboard_cache
      )
      UPDATE leaderboard_cache lc
      SET rank = r.computed_rank
      FROM ranked r
      WHERE lc.user_id = r.user_id AND lc.league_id = r.league_id
    `);
  });
}
