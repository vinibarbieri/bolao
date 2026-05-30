/**
 * Pure mapping between bracket slots and knockout rounds.
 *
 * Slot semantics (see `bracket-mapping.ts`):
 *   R32  -> slots  1-16
 *   R16  -> slots 17-24
 *   QF   -> slots 25-28
 *   SF   -> slots 29-30
 *   Third-> slot  31   (third-place match)
 *   Final-> slot  32   (final; its winner is the champion)
 */

export type KnockoutRound =
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final"
  | "champion";

/** Maps a bracket slot to the knockout round whose winner occupies it. */
export function slotToRound(slot: number): KnockoutRound | null {
  if (slot >= 1 && slot <= 16) return "r32";
  if (slot >= 17 && slot <= 24) return "r16";
  if (slot >= 25 && slot <= 28) return "qf";
  if (slot >= 29 && slot <= 30) return "sf";
  if (slot === 31) return "third";
  if (slot === 32) return "final";
  return null;
}

/**
 * Derives knockout prediction rows from bracket picks: for each team, the set
 * of rounds it is predicted to reach. The slot-32 team additionally gets the
 * `champion` round (Final winner = champion).
 */
export function deriveKnockoutRounds(
  picks: { bracketSlot: number; teamId: string }[]
): { teamId: string; round: KnockoutRound }[] {
  const teamRounds = new Map<string, Set<KnockoutRound>>();

  for (const pick of picks) {
    const round = slotToRound(pick.bracketSlot);
    if (!round) continue;

    if (!teamRounds.has(pick.teamId)) {
      teamRounds.set(pick.teamId, new Set());
    }
    teamRounds.get(pick.teamId)!.add(round);

    // slot 32 winner is also the predicted champion
    if (pick.bracketSlot === 32) {
      teamRounds.get(pick.teamId)!.add("champion");
    }
  }

  const rows: { teamId: string; round: KnockoutRound }[] = [];
  for (const [teamId, rounds] of teamRounds) {
    for (const round of rounds) {
      rows.push({ teamId, round });
    }
  }
  return rows;
}
