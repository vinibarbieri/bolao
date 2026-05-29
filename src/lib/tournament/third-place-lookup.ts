/**
 * FIFA 2026 World Cup - Third-Place Qualification Lookup
 *
 * In the 48-team format (12 groups of 4), the top 2 from each group advance
 * automatically (24 teams), plus the 8 best 3rd-place finishers out of 12
 * groups advance to complete the Round of 32 bracket (32 teams total).
 *
 * The combination of which 8 groups produce qualifying 3rd-place teams
 * determines how those teams are slotted into the R32 bracket. There are
 * C(12, 8) = 495 possible combinations, each with a fixed assignment defined
 * in Annex C of the official tournament regulations.
 *
 * This module reads that official matrix (see THIRD_PLACE_MATRIX, generated
 * from matriz_fifa_oficial.csv) and converts each combination into the R32
 * slot assignments used by bracket-mapping.ts.
 */

import { THIRD_PLACE_MATRIX } from "./third-place-matrix";

export type GroupLetter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export const ALL_GROUPS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F',
  'G', 'H', 'I', 'J', 'K', 'L',
];

/**
 * The 8 R32 match slots designated for 3rd-place qualifiers, one per
 * group-winner match. The order here is aligned column-for-column with the
 * official matrix value string, whose columns are:
 *
 *   [1A,  1B,  1D, 1E, 1G, 1I, 1K, 1L]
 *
 * mapping onto internal bracket slots (see bracket-mapping.ts):
 *
 *   1A -> slot 11   1B -> slot 15   1D -> slot 7    1E -> slot 1
 *   1G -> slot 8    1I -> slot 2    1K -> slot 16   1L -> slot 12
 */
const WINNER_SLOTS = [11, 15, 7, 1, 8, 2, 16, 12] as const;

/**
 * The 8 R32 slots that host a (group winner vs 3rd-place team) match,
 * sorted ascending. Exposed for any consumer that needs the slot set.
 */
export const THIRD_PLACE_R32_SLOTS = [...WINNER_SLOTS]
  .sort((a, b) => a - b) as readonly number[];

export interface ThirdPlaceAssignment {
  /**
   * Maps each qualifying group's letter to the R32 match slot number
   * where that group's 3rd-place team will play.
   * e.g. { E: 11, J: 15, I: 7, F: 1, H: 8, G: 2, L: 16, K: 12 }
   */
  assignments: Record<string, number>;
}

/**
 * Given the 8 group letters whose 3rd-place teams qualify, returns the R32
 * slot assignments for those teams, per the official FIFA matrix.
 *
 * @param qualifyingGroups - Exactly 8 distinct GroupLetters
 * @returns ThirdPlaceAssignment with one entry per qualifying group
 * @throws Error if not exactly 8 unique valid group letters are provided, or
 *   if the combination is missing from the official matrix
 *
 * @example
 * ```ts
 * const result = getThirdPlaceAssignments(['E','F','G','H','I','J','K','L']);
 * // result.assignments => { F: 1, G: 2, I: 7, H: 8, E: 11, K: 12, J: 15, L: 16 }
 * ```
 */
export function getThirdPlaceAssignments(
  qualifyingGroups: GroupLetter[],
): ThirdPlaceAssignment {
  // Validate input
  const uniqueGroups = new Set(qualifyingGroups);
  if (uniqueGroups.size !== 8) {
    throw new Error(
      `Expected exactly 8 unique qualifying groups, got ${uniqueGroups.size} ` +
      `(input had ${qualifyingGroups.length} items)`,
    );
  }
  for (const g of qualifyingGroups) {
    if (!ALL_GROUPS.includes(g)) {
      throw new Error(`Invalid group letter: "${g}"`);
    }
  }

  const key = getCombinationKey(qualifyingGroups);
  const matrixValue = THIRD_PLACE_MATRIX[key];
  if (!matrixValue) {
    throw new Error(`No official matrix entry for combination "${key}"`);
  }

  // matrixValue[i] is the 3rd-place group assigned to WINNER_SLOTS[i].
  const assignments: Record<string, number> = {};
  for (let i = 0; i < WINNER_SLOTS.length; i++) {
    const group = matrixValue[i];
    assignments[group] = WINNER_SLOTS[i];
  }

  return { assignments };
}

/**
 * Convenience: returns the sorted 8-letter key string for a combination.
 * Matches the keys used in THIRD_PLACE_MATRIX.
 *
 * @example
 * ```ts
 * getCombinationKey(['D','A','C','B','H','G','F','E']); // => "ABCDEFGH"
 * ```
 */
export function getCombinationKey(qualifyingGroups: GroupLetter[]): string {
  return [...qualifyingGroups].sort().join('');
}

/**
 * Generates all C(12, 8) = 495 possible combinations of qualifying groups.
 * Useful for pre-computing or validating the full lookup table.
 */
export function getAllCombinations(): GroupLetter[][] {
  const results: GroupLetter[][] = [];

  function choose(
    start: number,
    current: GroupLetter[],
    remaining: number,
  ): void {
    if (remaining === 0) {
      results.push([...current]);
      return;
    }
    for (let i = start; i <= ALL_GROUPS.length - remaining; i++) {
      current.push(ALL_GROUPS[i]);
      choose(i + 1, current, remaining - 1);
      current.pop();
    }
  }

  choose(0, [], 8);
  return results;
}

/**
 * Pre-computed full lookup table (lazily initialized).
 * Maps the sorted 8-letter key to the assignment object.
 */
let _fullLookupTable: Map<string, ThirdPlaceAssignment> | null = null;

export function getFullLookupTable(): Map<string, ThirdPlaceAssignment> {
  if (_fullLookupTable) return _fullLookupTable;

  _fullLookupTable = new Map();
  for (const combo of getAllCombinations()) {
    const key = getCombinationKey(combo);
    _fullLookupTable.set(key, getThirdPlaceAssignments(combo));
  }
  return _fullLookupTable;
}
