import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.error("FOOTBALL_DATA_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Imported dynamically so dotenv populates env before the db client (which
  // reads DATABASE_URL at module load) is initialized.
  const { syncWorldCupPlayers } = await import("@/lib/players/sync");

  console.log("Fetching World Cup squads from football-data.org...");
  const result = await syncWorldCupPlayers();

  console.log("Player sync complete:");
  console.log(`  inserted:  ${result.inserted}`);
  console.log(`  updated:   ${result.updated}`);
  console.log(`  unchanged: ${result.unchanged}`);
  console.log(`  total from API: ${result.totalApiPlayers}`);
  if (result.unmatchedTeams.length > 0) {
    console.warn(`  unmatched teams: ${result.unmatchedTeams.join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Player sync failed:", err);
    process.exit(1);
  });
