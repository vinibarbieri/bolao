/**
 * Bracket reconciliation.
 *
 * Winner picks (bracket slots 1-32) are persisted, but the R32 base composition
 * (who enters the bracket, keyed by slot*100+1/2) is recomputed from the user's
 * group predictions every time. When group predictions change, a saved winner
 * can end up referring to a team that no longer feeds the slot it was picked in.
 *
 * `reconcileBracketPicks` walks the bracket tree in topological order and keeps
 * a winner only if it is still one of the two teams currently feeding its slot.
 * Pruning a winner cascades: the next round reads an empty feeder, so its winner
 * stops matching and is pruned too.
 *
 * Shared by the bracket builder (client, on load) and `saveThirdPlaceSelections`
 * (server, authoritative) so the tree logic exists in exactly one place.
 */

import { BRACKET_STRUCTURE, resolveR32Matchups, type TeamSource } from "./bracket-mapping";
import { getThirdPlaceAssignments, type GroupLetter } from "./third-place-lookup";

/** R32 "home" position key for a slot (the higher seed). */
export function r32HomeKey(slot: number): number {
  return slot * 100 + 1;
}

/** R32 "away" position key for a slot. */
export function r32AwayKey(slot: number): number {
  return slot * 100 + 2;
}

/** slot/key -> teamId. Keys 1-32 are winners; keys >32 are R32 base positions. */
export type SlotTeamMap = Record<number, string | null | undefined>;

function sourceString(source: TeamSource): string {
  const positionMap: Record<string, string> = {
    group_winner: "1",
    group_runner_up: "2",
    third_place: "3",
  };
  return `${positionMap[source.type] ?? "?"}${source.group}`;
}

export interface GroupPredInput {
  teamId: string;
  groupLetter: string;
  predictedPosition: number;
  advancesAsThird: boolean;
}

/**
 * Resolves the R32 entrance positions (keys slot*100+1/2 -> teamId) from a
 * user's group predictions. Returns an empty map when the 8 third-place
 * qualifiers are not yet fully determined (base is not resolvable).
 */
export function buildR32Base(preds: GroupPredInput[]): Record<number, string> {
  const thirdGroups = preds
    .filter((p) => p.predictedPosition === 3 && p.advancesAsThird)
    .map((p) => p.groupLetter as GroupLetter);
  if (thirdGroups.length !== 8) return {};

  const matchups = resolveR32Matchups(
    getThirdPlaceAssignments(thirdGroups).assignments,
  );

  const bySource: Record<string, string> = {};
  for (const p of preds) {
    if (p.predictedPosition === 1) bySource[`1${p.groupLetter}`] = p.teamId;
    else if (p.predictedPosition === 2) bySource[`2${p.groupLetter}`] = p.teamId;
    else if (p.predictedPosition === 3 && p.advancesAsThird)
      bySource[`3${p.groupLetter}`] = p.teamId;
  }

  const base: Record<number, string> = {};
  for (const m of matchups) {
    const home = bySource[sourceString(m.homeSource)];
    const away = bySource[sourceString(m.awaySource)];
    if (home) base[r32HomeKey(m.slot)] = home;
    if (away) base[r32AwayKey(m.slot)] = away;
  }
  return base;
}

/**
 * Returns the two feeder slots/keys whose teams contest the given match slot,
 * resolved against the current picks (needed for the third-place match, whose
 * contestants are the two semi-final losers).
 *
 * A negative sentinel is returned for an undetermined third-place feeder, which
 * never matches a real teamId.
 */
export function feederSlots(slotNumber: number, picks: SlotTeamMap): [number, number] {
  // R32 matches are seeded directly from the base positions.
  if (slotNumber >= 1 && slotNumber <= 16) {
    return [r32HomeKey(slotNumber), r32AwayKey(slotNumber)];
  }

  const slot = BRACKET_STRUCTURE.find((s) => s.slotNumber === slotNumber)!;

  if (slot.round === "third") {
    // Contestants are the losers of the two semi-finals.
    const [sf1, sf2] = slot.sourceSlots!;
    const sf1Struct = BRACKET_STRUCTURE.find((s) => s.slotNumber === sf1)!;
    const sf2Struct = BRACKET_STRUCTURE.find((s) => s.slotNumber === sf2)!;
    const [sf1Src1, sf1Src2] = sf1Struct.sourceSlots!;
    const [sf2Src1, sf2Src2] = sf2Struct.sourceSlots!;
    const sf1Winner = picks[sf1];
    const sf2Winner = picks[sf2];
    const s1 = sf1Winner ? (picks[sf1Src1] === sf1Winner ? sf1Src2 : sf1Src1) : -1;
    const s2 = sf2Winner ? (picks[sf2Src1] === sf2Winner ? sf2Src2 : sf2Src1) : -2;
    return [s1, s2];
  }

  return slot.sourceSlots!;
}

export interface ReconcileResult {
  /** Surviving winner picks (slots 1-32) keyed by slot. */
  kept: Record<number, string>;
  /** Slots whose saved winner was pruned because it no longer feeds the slot. */
  prunedSlots: number[];
}

/**
 * Prunes saved winner picks that are inconsistent with the current R32 base.
 *
 * @param r32Base   Current R32 entrance positions (keys slot*100+1/2 -> teamId).
 * @param savedSlots Saved winner picks (slots 1-32 -> teamId).
 */
export function reconcileBracketPicks(
  r32Base: Record<number, string>,
  savedSlots: Record<number, string>,
): ReconcileResult {
  // Combined map drives feeder resolution; downstream slots read upstream winners.
  const combined: SlotTeamMap = { ...r32Base };
  const prunedSlots: number[] = [];

  // Natural slot order is topological: R32 (1-16), R16 (17-24), QF (25-28),
  // SF (29-30), Third (31) and Final (32) both depend only on 29-30.
  for (let slot = 1; slot <= 32; slot++) {
    const winner = savedSlots[slot];
    if (winner == null) continue;

    const [a, b] = feederSlots(slot, combined);
    if (winner === combined[a] || winner === combined[b]) {
      combined[slot] = winner; // still valid -> keep and let it feed forward
    } else {
      prunedSlots.push(slot);
    }
  }

  const kept: Record<number, string> = {};
  for (let slot = 1; slot <= 32; slot++) {
    const team = combined[slot];
    if (team != null) kept[slot] = team;
  }

  return { kept, prunedSlots };
}
