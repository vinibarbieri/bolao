import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { TEAMS_DATA, MATCHES_DATA } from "./data";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Seeding database...");

  // 1. Insert tournament config
  console.log("  -> Tournament config...");
  await db
    .insert(schema.tournamentConfig)
    .values({
      id: 1,
      // World Cup 2026 starts June 11, 2026
      predictionsLockAt: new Date("2026-06-11T00:00:00Z"),
      isLocked: false,
      currentStage: "pre_tournament",
    })
    .onConflictDoNothing();

  // 2. Insert teams
  console.log("  -> Teams (48)...");
  for (const team of TEAMS_DATA) {
    await db
      .insert(schema.teams)
      .values({
        id: team.id,
        name: team.name,
        flagUrl: team.flagUrl,
        groupLetter: team.groupLetter,
      })
      .onConflictDoNothing();
  }

  // 3. Insert group standings (initialized to 0)
  console.log("  -> Group standings...");
  for (const team of TEAMS_DATA) {
    await db
      .insert(schema.groupStandings)
      .values({
        teamId: team.id,
        groupLetter: team.groupLetter,
        position: null,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        isBestThird: false,
      })
      .onConflictDoNothing();
  }

  // 4. Insert matches
  console.log("  -> Matches (104)...");
  for (const match of MATCHES_DATA) {
    await db
      .insert(schema.matches)
      .values({
        stage: match.stage as "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final",
        groupLetter: match.groupLetter,
        matchNumber: match.matchNumber,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        kickoffAt: new Date(match.kickoffAt),
        status: "scheduled",
      })
      .onConflictDoNothing();
  }

  console.log("Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
