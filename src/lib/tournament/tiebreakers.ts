/**
 * FIFA 2026 World Cup - Group Stage Tiebreaker Algorithm
 *
 * Computes group standings from match results and applies the FIFA
 * tiebreaker rules (simplified) to produce a fully ordered table.
 *
 * Tiebreaker order (applied when teams are level on points):
 *  1. Goal difference (GD)
 *  2. Goals scored (GF)
 *  3. Head-to-head points among tied teams
 *  4. Head-to-head goal difference among tied teams
 *  5. Head-to-head goals scored among tied teams
 *  6. Fair play points (not implemented -- falls back to alphabetical)
 *  7. Drawing of lots (not implemented -- falls back to alphabetical)
 *
 * This module provides the deterministic subset (steps 1-5 plus a stable
 * alphabetical fallback) which is sufficient for the score simulator.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;  // goals for
  ga: number;  // goals against
  gd: number;  // goal difference (gf - ga)
  points: number;
}

// ---------------------------------------------------------------------------
// Core: compute standings
// ---------------------------------------------------------------------------

/**
 * Computes the group standings table from match results and returns them
 * sorted by the FIFA tiebreaker rules.
 *
 * @param teamIds - All team IDs in the group (typically 4)
 * @param results - All match results for this group
 * @returns Ordered array of StandingRows, index 0 = 1st place
 */
export function computeGroupStandings(
  teamIds: string[],
  results: MatchResult[],
): StandingRow[] {
  // Initialize empty standing rows
  const rowMap = new Map<string, StandingRow>();
  for (const id of teamIds) {
    rowMap.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }

  // Accumulate results
  for (const match of results) {
    const home = rowMap.get(match.homeTeamId);
    const away = rowMap.get(match.awayTeamId);
    if (!home || !away) continue; // skip matches involving teams not in this group

    home.played += 1;
    away.played += 1;

    home.gf += match.homeScore;
    home.ga += match.awayScore;
    away.gf += match.awayScore;
    away.ga += match.homeScore;

    if (match.homeScore > match.awayScore) {
      // Home win
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      // Away win
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      // Draw
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  // Finalize GD
  for (const row of rowMap.values()) {
    row.gd = row.gf - row.ga;
  }

  const rows = [...rowMap.values()];

  // Sort using the full tiebreaker chain
  return sortWithTiebreakers(rows, results);
}

// ---------------------------------------------------------------------------
// Sorting with tiebreakers
// ---------------------------------------------------------------------------

/**
 * Sorts standing rows using FIFA-style tiebreakers.
 *
 * The approach:
 *  1. Sort by the basic criteria (points, GD, GF) -- this handles most cases.
 *  2. Identify clusters of teams that are still tied on all basic criteria.
 *  3. For each tied cluster, apply head-to-head tiebreakers.
 *  4. If still tied, fall back to alphabetical order (stable, deterministic).
 */
function sortWithTiebreakers(
  rows: StandingRow[],
  allResults: MatchResult[],
): StandingRow[] {
  // Step 1: sort by points desc, then GD desc, then GF desc
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0; // tied on all basic criteria
  });

  // Step 2: find clusters of teams tied on (points, GD, GF)
  const resolved: StandingRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (
      j < rows.length &&
      rows[j].points === rows[i].points &&
      rows[j].gd === rows[i].gd &&
      rows[j].gf === rows[i].gf
    ) {
      j++;
    }

    if (j - i === 1) {
      // No tie -- single team
      resolved.push(rows[i]);
    } else {
      // Tied cluster: apply head-to-head
      const tiedTeams = rows.slice(i, j);
      const h2hResolved = resolveByHeadToHead(tiedTeams, allResults);
      resolved.push(...h2hResolved);
    }

    i = j;
  }

  return resolved;
}

/**
 * Resolves a group of tied teams using head-to-head results among them.
 *
 * Sub-tiebreakers (applied in this order among the tied subset):
 *  1. H2H points
 *  2. H2H goal difference
 *  3. H2H goals scored
 *  4. Alphabetical (deterministic fallback)
 */
function resolveByHeadToHead(
  tiedTeams: StandingRow[],
  allResults: MatchResult[],
): StandingRow[] {
  const teamIds = new Set(tiedTeams.map((r) => r.teamId));

  // Filter results to only matches between tied teams
  const h2hResults = allResults.filter(
    (m) => teamIds.has(m.homeTeamId) && teamIds.has(m.awayTeamId),
  );

  // Compute mini-standings for the tied group
  const h2hStats = new Map<
    string,
    { points: number; gf: number; ga: number; gd: number }
  >();
  for (const id of teamIds) {
    h2hStats.set(id, { points: 0, gf: 0, ga: 0, gd: 0 });
  }

  for (const match of h2hResults) {
    const home = h2hStats.get(match.homeTeamId)!;
    const away = h2hStats.get(match.awayTeamId)!;

    home.gf += match.homeScore;
    home.ga += match.awayScore;
    away.gf += match.awayScore;
    away.ga += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.points += 3;
    } else if (match.homeScore < match.awayScore) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  // Finalize H2H GD
  for (const stats of h2hStats.values()) {
    stats.gd = stats.gf - stats.ga;
  }

  // Sort the tied teams by H2H criteria, then alphabetical fallback
  const sorted = [...tiedTeams].sort((a, b) => {
    const ha = h2hStats.get(a.teamId)!;
    const hb = h2hStats.get(b.teamId)!;

    // H2H points
    if (hb.points !== ha.points) return hb.points - ha.points;
    // H2H goal difference
    if (hb.gd !== ha.gd) return hb.gd - ha.gd;
    // H2H goals scored
    if (hb.gf !== ha.gf) return hb.gf - ha.gf;
    // Alphabetical fallback (deterministic)
    return a.teamId.localeCompare(b.teamId);
  });

  return sorted;
}

// ---------------------------------------------------------------------------
// Utility: rank 3rd-place teams across all groups
// ---------------------------------------------------------------------------

/**
 * Given the 3rd-place teams from all 12 groups, ranks them and returns
 * the best 8 (i.e., the ones that qualify for the R32).
 *
 * The ranking uses the same criteria as within a group:
 *  Points -> GD -> GF -> alphabetical fallback
 *
 * @param thirdPlaceRows - Array of 12 StandingRows, one per group's 3rd place
 * @returns The 8 best 3rd-place StandingRows, sorted best-first
 */
export function rankThirdPlaceTeams(
  thirdPlaceRows: StandingRow[],
): StandingRow[] {
  const sorted = [...thirdPlaceRows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // No head-to-head across different groups, so alphabetical fallback
    return a.teamId.localeCompare(b.teamId);
  });

  return sorted.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Utility: determine group position
// ---------------------------------------------------------------------------

export type GroupPosition = '1st' | '2nd' | '3rd' | '4th';

/**
 * Returns the position labels for each team in a computed standings array.
 *
 * @param standings - Ordered standings (index 0 = 1st place)
 * @returns Map of teamId -> position label
 */
export function getGroupPositions(
  standings: StandingRow[],
): Map<string, GroupPosition> {
  const positions: GroupPosition[] = ['1st', '2nd', '3rd', '4th'];
  const result = new Map<string, GroupPosition>();
  for (let i = 0; i < standings.length && i < positions.length; i++) {
    result.set(standings[i].teamId, positions[i]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Utility: generate all group matches (round-robin)
// ---------------------------------------------------------------------------

/**
 * Generates all possible match pairings for a group of teams.
 * For 4 teams this produces 6 matches (C(4,2)).
 * Does not produce scores -- just the pairings.
 *
 * @param teamIds - Array of team IDs in the group
 * @returns Array of [homeTeamId, awayTeamId] tuples
 */
export function generateGroupMatchPairings(
  teamIds: string[],
): [string, string][] {
  const pairings: [string, string][] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairings.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairings;
}
