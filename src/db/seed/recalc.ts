import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * One-off / maintenance runner: recompute every user's scores and leaderboard
 * cache. Same logic the admin "Recalculate" button and cron sync invoke.
 *
 * Usage: npm run db:recalc
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const { recalculateAllScores } = await import("@/lib/scoring/recalculate");

  console.log("Recalculating all scores...");
  await recalculateAllScores();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
