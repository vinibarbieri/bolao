/**
 * Resolves the winner (advancing team) of a match.
 *
 * - Decisive score → higher-scoring team.
 * - Level group match → no winner (draws are allowed in the group stage).
 * - Level knockout match → the explicitly supplied advancing team, but only
 *   if it is one of the two participants; otherwise no winner.
 */
export function resolveWinner(params: {
  homeScore: number;
  awayScore: number;
  isGroup: boolean;
  homeTeamId: string | null;
  awayTeamId: string | null;
  advancingTeamId?: string | null;
}): string | null {
  const { homeScore, awayScore, isGroup, homeTeamId, awayTeamId, advancingTeamId } =
    params;

  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;
  if (isGroup) return null;

  // Level knockout match — the advancing team must be supplied and valid.
  if (advancingTeamId === homeTeamId || advancingTeamId === awayTeamId) {
    return advancingTeamId ?? null;
  }
  return null;
}
