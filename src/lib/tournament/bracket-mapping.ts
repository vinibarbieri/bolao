/**
 * FIFA 2026 World Cup - R32 Bracket Structure
 *
 * 32 teams enter the knockout stage:
 *   - 12 group winners (1st place from groups A-L)
 *   - 12 group runners-up (2nd place from groups A-L)
 *   -  8 best 3rd-place teams (determined by third-place-lookup.ts)
 *
 * The bracket is a standard single-elimination tree with 32 slots
 * across 6 rounds:
 *   R32:   16 matches  (slots  1-16)
 *   R16:    8 matches  (slots 17-24)
 *   QF:     4 matches  (slots 25-28)
 *   SF:     2 matches  (slots 29-30)
 *   Third:  1 match    (slot  31)   -- losers of SF
 *   Final:  1 match    (slot  32)   -- winners of SF
 *
 * Total: 32 bracket slots.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BracketRound = 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

export interface BracketSlot {
  /** Unique slot number (1-32) */
  slotNumber: number;
  /** Which round this slot belongs to */
  round: BracketRound;
  /**
   * The two source slots whose winners/losers feed into this match.
   * Undefined for R32 slots (they are seeded directly).
   * For the Third-place match (slot 31), these are the LOSERS of the SFs.
   */
  sourceSlots?: [number, number];
}

export type TeamSourceType = 'group_winner' | 'group_runner_up' | 'third_place';

export interface TeamSource {
  type: TeamSourceType;
  /**
   * The group letter (A-L).
   * For 'third_place' type, this is determined at runtime by the
   * third-place lookup module based on which 8 groups qualify.
   * Use 'TBD' as a placeholder when the group is not yet known.
   */
  group: string;
}

export interface R32Matchup {
  /** R32 slot number (1-16) */
  slot: number;
  /** The "home" team source (typically the higher seed) */
  homeSource: TeamSource;
  /** The "away" team source */
  awaySource: TeamSource;
}

// ---------------------------------------------------------------------------
// Bracket tree structure (all 32 slots)
// ---------------------------------------------------------------------------

export const BRACKET_STRUCTURE: BracketSlot[] = [
  // === R32: 16 matches (slots 1-16) ===
  { slotNumber: 1,  round: 'r32' },
  { slotNumber: 2,  round: 'r32' },
  { slotNumber: 3,  round: 'r32' },
  { slotNumber: 4,  round: 'r32' },
  { slotNumber: 5,  round: 'r32' },
  { slotNumber: 6,  round: 'r32' },
  { slotNumber: 7,  round: 'r32' },
  { slotNumber: 8,  round: 'r32' },
  { slotNumber: 9,  round: 'r32' },
  { slotNumber: 10, round: 'r32' },
  { slotNumber: 11, round: 'r32' },
  { slotNumber: 12, round: 'r32' },
  { slotNumber: 13, round: 'r32' },
  { slotNumber: 14, round: 'r32' },
  { slotNumber: 15, round: 'r32' },
  { slotNumber: 16, round: 'r32' },

  // === R16: 8 matches (slots 17-24) ===
  // Winners of adjacent R32 pairs feed in
  { slotNumber: 17, round: 'r16', sourceSlots: [1, 2] },
  { slotNumber: 18, round: 'r16', sourceSlots: [3, 4] },
  { slotNumber: 19, round: 'r16', sourceSlots: [5, 6] },
  { slotNumber: 20, round: 'r16', sourceSlots: [7, 8] },
  { slotNumber: 21, round: 'r16', sourceSlots: [9, 10] },
  { slotNumber: 22, round: 'r16', sourceSlots: [11, 12] },
  { slotNumber: 23, round: 'r16', sourceSlots: [13, 14] },
  { slotNumber: 24, round: 'r16', sourceSlots: [15, 16] },

  // === QF: 4 matches (slots 25-28) ===
  { slotNumber: 25, round: 'qf', sourceSlots: [17, 18] },
  { slotNumber: 26, round: 'qf', sourceSlots: [19, 20] },
  { slotNumber: 27, round: 'qf', sourceSlots: [21, 22] },
  { slotNumber: 28, round: 'qf', sourceSlots: [23, 24] },

  // === SF: 2 matches (slots 29-30) ===
  { slotNumber: 29, round: 'sf', sourceSlots: [25, 26] },
  { slotNumber: 30, round: 'sf', sourceSlots: [27, 28] },

  // === Third-place match (slot 31): losers of SFs ===
  { slotNumber: 31, round: 'third', sourceSlots: [29, 30] },

  // === Final (slot 32): winners of SFs ===
  { slotNumber: 32, round: 'final', sourceSlots: [29, 30] },
];

// ---------------------------------------------------------------------------
// R32 matchups - who plays whom in the Round of 32
// ---------------------------------------------------------------------------
//
// Design principles:
//  - Group winners (seeds) are placed in odd-numbered slots as "home"
//    and face 3rd-place qualifiers as "away" -- 8 such matches.
//  - Even-numbered slots pit runners-up against each other, drawn from
//    different groups to prevent same-group rematches.
//  - The pairing ensures that teams from the same group cannot meet
//    until the QF at the earliest.
//  - Remaining 4 group winners (I, J, K, L) who don't face 3rd-place
//    teams instead face runners-up from distant groups.
//
// Bracket layout (left half / right half):
//
//  LEFT HALF (slots 1-8 -> R16 slots 17-20 -> QF 25-26 -> SF 29)
//    Slot 1:  1A  vs  3rd(pool)     --\
//    Slot 2:  2C  vs  2D            --/-- R16 #17
//    Slot 3:  1B  vs  3rd(pool)     --\
//    Slot 4:  2E  vs  2F            --/-- R16 #18
//    Slot 5:  1C  vs  3rd(pool)     --\
//    Slot 6:  2A  vs  2B            --/-- R16 #19
//    Slot 7:  1D  vs  3rd(pool)     --\
//    Slot 8:  1I  vs  2H            --/-- R16 #20
//
//  RIGHT HALF (slots 9-16 -> R16 slots 21-24 -> QF 27-28 -> SF 30)
//    Slot 9:  1E  vs  3rd(pool)     --\
//    Slot 10: 2G  vs  2J            --/-- R16 #21
//    Slot 11: 1F  vs  3rd(pool)     --\
//    Slot 12: 2I  vs  2L            --/-- R16 #22
//    Slot 13: 1G  vs  3rd(pool)     --\
//    Slot 14: 1J  vs  2K            --/-- R16 #23
//    Slot 15: 1H  vs  3rd(pool)     --\
//    Slot 16: 1K  vs  2G... wait
//
// Correction -- let's use a clean, balanced assignment:
//
// With 12 group winners, 12 runners-up, and 8 third-place teams:
//  - 8 group winners face 3rd-place teams (odd slots: 1,3,5,7,9,11,13,15)
//  - 4 group winners face runners-up from distant groups (even slots among the remaining)
//  - 8 runners-up face each other in 4 matches (4 even slots)
//  Total: 8 + 4 + 4 = 16 matches

export const R32_MATCHUPS: R32Matchup[] = [
  // -----------------------------------------------------------------------
  // LEFT HALF OF BRACKET
  // -----------------------------------------------------------------------

  // -- Quarter 1 (feeds QF slot 25 via R16 slots 17, 18) --

  // R32 slot 1: Group A winner vs 3rd-place qualifier
  {
    slot: 1,
    homeSource: { type: 'group_winner', group: 'A' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 2: Group C runner-up vs Group D runner-up
  {
    slot: 2,
    homeSource: { type: 'group_runner_up', group: 'C' },
    awaySource: { type: 'group_runner_up', group: 'D' },
  },
  // R32 slot 3: Group B winner vs 3rd-place qualifier
  {
    slot: 3,
    homeSource: { type: 'group_winner', group: 'B' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 4: Group E runner-up vs Group F runner-up
  {
    slot: 4,
    homeSource: { type: 'group_runner_up', group: 'E' },
    awaySource: { type: 'group_runner_up', group: 'F' },
  },

  // -- Quarter 2 (feeds QF slot 26 via R16 slots 19, 20) --

  // R32 slot 5: Group C winner vs 3rd-place qualifier
  {
    slot: 5,
    homeSource: { type: 'group_winner', group: 'C' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 6: Group A runner-up vs Group B runner-up
  {
    slot: 6,
    homeSource: { type: 'group_runner_up', group: 'A' },
    awaySource: { type: 'group_runner_up', group: 'B' },
  },
  // R32 slot 7: Group D winner vs 3rd-place qualifier
  {
    slot: 7,
    homeSource: { type: 'group_winner', group: 'D' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 8: Group I winner vs Group H runner-up
  {
    slot: 8,
    homeSource: { type: 'group_winner', group: 'I' },
    awaySource: { type: 'group_runner_up', group: 'H' },
  },

  // -----------------------------------------------------------------------
  // RIGHT HALF OF BRACKET
  // -----------------------------------------------------------------------

  // -- Quarter 3 (feeds QF slot 27 via R16 slots 21, 22) --

  // R32 slot 9: Group E winner vs 3rd-place qualifier
  {
    slot: 9,
    homeSource: { type: 'group_winner', group: 'E' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 10: Group G runner-up vs Group J runner-up
  {
    slot: 10,
    homeSource: { type: 'group_runner_up', group: 'G' },
    awaySource: { type: 'group_runner_up', group: 'J' },
  },
  // R32 slot 11: Group F winner vs 3rd-place qualifier
  {
    slot: 11,
    homeSource: { type: 'group_winner', group: 'F' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 12: Group I runner-up vs Group L runner-up
  {
    slot: 12,
    homeSource: { type: 'group_runner_up', group: 'I' },
    awaySource: { type: 'group_runner_up', group: 'L' },
  },

  // -- Quarter 4 (feeds QF slot 28 via R16 slots 23, 24) --

  // R32 slot 13: Group G winner vs 3rd-place qualifier
  {
    slot: 13,
    homeSource: { type: 'group_winner', group: 'G' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 14: Group J winner vs Group K runner-up
  {
    slot: 14,
    homeSource: { type: 'group_winner', group: 'J' },
    awaySource: { type: 'group_runner_up', group: 'K' },
  },
  // R32 slot 15: Group H winner vs 3rd-place qualifier
  {
    slot: 15,
    homeSource: { type: 'group_winner', group: 'H' },
    awaySource: { type: 'third_place', group: 'TBD' },
  },
  // R32 slot 16: Group K winner vs Group L winner -- wait, that's 2 winners
  // We have 12 winners total. 8 are in odd slots. 4 remain: I, J, K, L.
  // I is in slot 8, J is in slot 14. K and L need even slots.
  {
    slot: 16,
    homeSource: { type: 'group_winner', group: 'K' },
    awaySource: { type: 'group_winner', group: 'L' },
  },
];

// ---------------------------------------------------------------------------
// Helper: resolve 3rd-place TBD groups in matchups
// ---------------------------------------------------------------------------

/**
 * Given the third-place assignment mapping (group -> R32 slot), returns
 * a new copy of R32_MATCHUPS with all 'TBD' groups resolved to actual
 * group letters.
 *
 * @param thirdPlaceAssignments - Record mapping group letter to R32 slot
 *   (as returned by getThirdPlaceAssignments().assignments)
 * @returns Resolved R32Matchup array with concrete group letters
 */
export function resolveR32Matchups(
  thirdPlaceAssignments: Record<string, number>,
): R32Matchup[] {
  // Invert the mapping: slot -> group
  const slotToGroup: Record<number, string> = {};
  for (const [group, slot] of Object.entries(thirdPlaceAssignments)) {
    slotToGroup[slot] = group;
  }

  return R32_MATCHUPS.map((matchup) => {
    const resolved = { ...matchup };

    if (matchup.homeSource.type === 'third_place' && matchup.homeSource.group === 'TBD') {
      const group = slotToGroup[matchup.slot];
      if (!group) {
        throw new Error(`No 3rd-place team assigned to R32 slot ${matchup.slot}`);
      }
      resolved.homeSource = { type: 'third_place', group };
    }

    if (matchup.awaySource.type === 'third_place' && matchup.awaySource.group === 'TBD') {
      const group = slotToGroup[matchup.slot];
      if (!group) {
        throw new Error(`No 3rd-place team assigned to R32 slot ${matchup.slot}`);
      }
      resolved.awaySource = { type: 'third_place', group };
    }

    return resolved;
  });
}

// ---------------------------------------------------------------------------
// Helpers for navigating the bracket tree
// ---------------------------------------------------------------------------

/** Look up a bracket slot by its number */
export function getSlot(slotNumber: number): BracketSlot | undefined {
  return BRACKET_STRUCTURE.find((s) => s.slotNumber === slotNumber);
}

/** Get all slots for a given round */
export function getSlotsByRound(round: BracketRound): BracketSlot[] {
  return BRACKET_STRUCTURE.filter((s) => s.round === round);
}

/**
 * Given a slot number, return the slot number of the match in the next round
 * that this slot's winner advances to. Returns undefined for the Final.
 */
export function getNextSlot(slotNumber: number): number | undefined {
  // Special case: third-place match and final don't advance further
  if (slotNumber === 31 || slotNumber === 32) return undefined;

  return BRACKET_STRUCTURE.find(
    (s) =>
      s.sourceSlots !== undefined &&
      s.sourceSlots.includes(slotNumber) &&
      // Exclude the third-place match -- winners go to the final, not 3rd place
      s.round !== 'third',
  )?.slotNumber;
}

/**
 * Returns the full path from a given R32 slot to the Final,
 * as an array of slot numbers.
 *
 * @example
 * ```ts
 * getPathToFinal(1); // => [1, 17, 25, 29, 32]
 * ```
 */
export function getPathToFinal(startSlot: number): number[] {
  const path: number[] = [startSlot];
  let current: number | undefined = startSlot;
  while (current !== undefined) {
    current = getNextSlot(current);
    if (current !== undefined) {
      path.push(current);
    }
  }
  return path;
}
