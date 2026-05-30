/**
 * Pure group-standings math. No DB access so it is unit-testable in isolation.
 */

export interface MatchResult {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  position: number;
}

export interface ThirdRow {
  teamId: string;
  points: number | null;
  gd: number | null;
  gf: number | null;
}

// Builds a sorted, positioned standings table from a group's finished matches.
// Sort order is FIFA tiebreaker: points → GD → GF.
export function computeStandings(groupMatches: MatchResult[]): StandingRow[] {
  const stats: Record<
    string,
    { played: number; won: number; drawn: number; lost: number; gf: number; ga: number }
  > = {};

  for (const m of groupMatches) {
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null)
      continue;

    for (const teamId of [m.homeTeamId, m.awayTeamId]) {
      if (!stats[teamId]) {
        stats[teamId] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      }
    }

    stats[m.homeTeamId].played++;
    stats[m.awayTeamId].played++;
    stats[m.homeTeamId].gf += m.homeScore;
    stats[m.homeTeamId].ga += m.awayScore;
    stats[m.awayTeamId].gf += m.awayScore;
    stats[m.awayTeamId].ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      stats[m.homeTeamId].won++;
      stats[m.awayTeamId].lost++;
    } else if (m.awayScore > m.homeScore) {
      stats[m.awayTeamId].won++;
      stats[m.homeTeamId].lost++;
    } else {
      stats[m.homeTeamId].drawn++;
      stats[m.awayTeamId].drawn++;
    }
  }

  return Object.entries(stats)
    .map(([teamId, s]) => ({
      teamId,
      ...s,
      gd: s.gf - s.ga,
      points: s.won * 3 + s.drawn,
    }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    .map((s, i) => ({ ...s, position: i + 1 }));
}

// From the third-place teams, returns the set of the best 8 by FIFA
// tiebreaker (points → GD → GF).
export function selectBestThirds(thirds: ThirdRow[]): Set<string> {
  const sorted = [...thirds].sort(
    (a, b) =>
      (b.points ?? 0) - (a.points ?? 0) ||
      (b.gd ?? 0) - (a.gd ?? 0) ||
      (b.gf ?? 0) - (a.gf ?? 0),
  );
  return new Set(sorted.slice(0, 8).map((t) => t.teamId));
}
