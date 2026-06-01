import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema/matches";
import { teams } from "@/db/schema/teams";
import { buildTeamResolver } from "@/lib/teams/resolve";
import { resolveWinner } from "@/lib/tournament/winner";
import {
  updateGroupStandings,
  recalculateBestThirds,
} from "@/lib/scoring/group-standings";
import { recalculateAllScores } from "@/lib/scoring/recalculate";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";

import { mapStage, groupLetterFrom } from "./stage-map";

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { id: number | null; name: string | null; tla: string | null };
  awayTeam: { id: number | null; name: string | null; tla: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
}

export interface SyncMatchesResult {
  linked: number; // rows that got an externalApiId stamped this run
  resultsApplied: number; // finished matches whose score/winner was written
  unmatchedStages: string[]; // API stage strings we could not map
  unmatchedMatches: string[]; // API matches with no local row to attach to
}

/**
 * Pulls the World Cup match list from football-data.org and reconciles it with
 * the local `matches` table.
 *
 * - Group matches are matched by group letter + unordered team pair.
 * - Knockout matches (seeded with TBD teams) are matched by external id once
 *   linked, otherwise filled into the next unlinked row of the same stage; the
 *   actual participants + winner are written so stage-based knockout scoring has
 *   real data to read.
 *
 * Idempotent: once a row has an `externalApiId`, later runs update it in place.
 */
export async function syncWorldCupMatches(): Promise<SyncMatchesResult> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  }

  const res = await fetch(`${FOOTBALL_DATA_API}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { matches?: FootballDataMatch[] };
  const apiMatches = (data.matches ?? [])
    .slice()
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  const localTeams = await db.select().from(teams);
  const resolveTeamId = buildTeamResolver(localTeams);

  const localMatches = await db.select().from(matches);

  // Index existing links.
  const byExternalId = new Map(
    localMatches
      .filter((m) => m.externalApiId)
      .map((m) => [m.externalApiId as string, m])
  );
  const usedLocalIds = new Set<string>(
    localMatches.filter((m) => m.externalApiId).map((m) => m.id)
  );

  // Queue of unlinked local knockout rows per stage, ordered by matchNumber, so
  // we deterministically fill them as the API reveals participants. (Stage-based
  // scoring makes the exact within-stage row irrelevant.)
  const knockoutQueues: Record<string, typeof localMatches> = {};
  for (const m of localMatches) {
    if (m.stage === "group" || m.externalApiId) continue;
    (knockoutQueues[m.stage] ??= []).push(m);
  }
  for (const stage of Object.keys(knockoutQueues)) {
    knockoutQueues[stage].sort(
      (a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)
    );
  }
  const queueCursor: Record<string, number> = {};

  const result: SyncMatchesResult = {
    linked: 0,
    resultsApplied: 0,
    unmatchedStages: [],
    unmatchedMatches: [],
  };
  const dirtyGroups = new Set<string>();
  let anyFinished = false;

  for (const apiMatch of apiMatches) {
    const stage = mapStage(apiMatch.stage);
    if (!stage) {
      if (!result.unmatchedStages.includes(apiMatch.stage)) {
        result.unmatchedStages.push(apiMatch.stage);
      }
      continue;
    }

    const externalApiId = String(apiMatch.id);
    const homeTeamId = resolveTeamId(apiMatch.homeTeam);
    const awayTeamId = resolveTeamId(apiMatch.awayTeam);

    // Locate the local row to update.
    let local = byExternalId.get(externalApiId) ?? null;

    if (!local) {
      if (stage === "group") {
        const letter = groupLetterFrom(apiMatch.group);
        local =
          localMatches.find(
            (m) =>
              m.stage === "group" &&
              !usedLocalIds.has(m.id) &&
              (letter ? m.groupLetter === letter : true) &&
              ((m.homeTeamId === homeTeamId && m.awayTeamId === awayTeamId) ||
                (m.homeTeamId === awayTeamId && m.awayTeamId === homeTeamId))
          ) ?? null;
      } else {
        // Knockout: only attach once both participants are known.
        if (homeTeamId && awayTeamId) {
          const queue = knockoutQueues[stage] ?? [];
          const cursor = queueCursor[stage] ?? 0;
          if (cursor < queue.length) {
            local = queue[cursor];
            queueCursor[stage] = cursor + 1;
          }
        }
      }
    }

    if (!local) {
      result.unmatchedMatches.push(
        `${externalApiId} (${apiMatch.stage}) ${apiMatch.homeTeam?.name ?? "?"} v ${apiMatch.awayTeam?.name ?? "?"}`
      );
      continue;
    }

    usedLocalIds.add(local.id);
    const isNewLink = !local.externalApiId;
    if (isNewLink) result.linked++;

    const finished = apiMatch.status === "FINISHED";
    const homeScore = apiMatch.score.fullTime.home;
    const awayScore = apiMatch.score.fullTime.away;

    const advancingTeamId =
      apiMatch.score.winner === "HOME_TEAM"
        ? homeTeamId
        : apiMatch.score.winner === "AWAY_TEAM"
          ? awayTeamId
          : null;

    const winnerTeamId =
      finished && homeScore !== null && awayScore !== null
        ? resolveWinner({
            homeScore,
            awayScore,
            isGroup: stage === "group",
            homeTeamId: local.homeTeamId ?? homeTeamId,
            awayTeamId: local.awayTeamId ?? awayTeamId,
            advancingTeamId,
          })
        : null;

    await db
      .update(matches)
      .set({
        externalApiId,
        // Group rows already have correct teams; knockout rows get them filled.
        homeTeamId: stage === "group" ? local.homeTeamId : homeTeamId,
        awayTeamId: stage === "group" ? local.awayTeamId : awayTeamId,
        ...(finished && homeScore !== null && awayScore !== null
          ? { homeScore, awayScore, winnerTeamId, status: "finished" as const }
          : {}),
      })
      .where(eq(matches.id, local.id));

    if (finished && homeScore !== null && awayScore !== null) {
      result.resultsApplied++;
      anyFinished = true;
      if (stage === "group" && local.groupLetter) {
        dirtyGroups.add(local.groupLetter);
      }
    }
  }

  // Recompute standings for groups that changed, then scores once.
  for (const letter of dirtyGroups) {
    await updateGroupStandings(letter);
  }
  if (dirtyGroups.size > 0) {
    await recalculateBestThirds();
  }
  if (anyFinished) {
    await recalculateAllScores();
  }

  return result;
}
