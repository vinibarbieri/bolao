import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema/matches";
import { teams } from "@/db/schema/teams";
import { buildTeamResolver } from "@/lib/teams/resolve";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";

type PlayerPosition = "GK" | "DF" | "MF" | "FW";

interface FootballDataPlayer {
  id: number;
  name: string;
  position: string | null;
}

interface FootballDataTeam {
  tla: string | null;
  name: string;
  squad: FootballDataPlayer[];
}

export interface SyncPlayersResult {
  inserted: number;
  updated: number;
  unchanged: number;
  /** TLAs / names from the API that could not be matched to a local team. */
  unmatchedTeams: string[];
  totalApiPlayers: number;
}

// Maps football-data's granular position labels onto our GK/DF/MF/FW enum.
function mapPosition(raw: string | null): PlayerPosition {
  if (!raw) return "MF";
  const p = raw.toLowerCase();
  if (p.includes("keeper")) return "GK";
  if (p.includes("back") || p === "defence" || p.includes("defender"))
    return "DF";
  if (p.includes("midfield")) return "MF";
  if (
    p.includes("forward") ||
    p.includes("winger") ||
    p.includes("striker") ||
    p === "offence" ||
    p.includes("attack")
  )
    return "FW";
  return "MF";
}

/**
 * Fetches every World Cup squad from football-data.org and upserts the players
 * into the `players` table.
 *
 * Idempotent: players are matched on `external_api_id`, so re-running updates
 * existing rows in place (preserving their UUIDs, and therefore any award /
 * golden-trio predictions that reference them) rather than creating duplicates.
 */
export async function syncWorldCupPlayers(): Promise<SyncPlayersResult> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  }

  const res = await fetch(`${FOOTBALL_DATA_API}/competitions/WC/teams`, {
    headers: { "X-Auth-Token": apiKey },
    // Squads change rarely; avoid Next.js caching a stale roster.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { teams?: FootballDataTeam[] };
  const apiTeams = data.teams ?? [];

  // Build lookup tables to resolve an API team to a local team id.
  const localTeams = await db.select().from(teams);
  const resolveTeamId = buildTeamResolver(localTeams);

  // Snapshot existing players so we can update in place by external id.
  const existing = await db.select().from(players);
  const byExternalId = new Map(
    existing
      .filter((p) => p.externalApiId)
      .map((p) => [p.externalApiId as string, p]),
  );

  const toInsert: (typeof players.$inferInsert)[] = [];
  const unmatchedTeams: string[] = [];
  let updated = 0;
  let unchanged = 0;
  let totalApiPlayers = 0;

  for (const apiTeam of apiTeams) {
    const teamId = resolveTeamId(apiTeam);
    if (!teamId) {
      unmatchedTeams.push(apiTeam.tla ?? apiTeam.name);
      continue;
    }

    for (const apiPlayer of apiTeam.squad ?? []) {
      totalApiPlayers++;
      const externalApiId = String(apiPlayer.id);
      const position = mapPosition(apiPlayer.position);
      const current = byExternalId.get(externalApiId);

      if (current) {
        if (
          current.name !== apiPlayer.name ||
          current.teamId !== teamId ||
          current.position !== position
        ) {
          await db
            .update(players)
            .set({ name: apiPlayer.name, teamId, position })
            .where(eq(players.id, current.id));
          updated++;
        } else {
          unchanged++;
        }
      } else {
        toInsert.push({
          name: apiPlayer.name,
          teamId,
          position,
          externalApiId,
        });
      }
    }
  }

  if (toInsert.length > 0) {
    await db.insert(players).values(toInsert);
  }

  return {
    inserted: toInsert.length,
    updated,
    unchanged,
    unmatchedTeams,
    totalApiPlayers,
  };
}
