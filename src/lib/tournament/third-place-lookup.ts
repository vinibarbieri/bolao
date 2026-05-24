/**
 * FIFA 2026 World Cup - Third-Place Qualification Lookup
 *
 * In the 48-team format (12 groups of 4), the top 2 from each group advance
 * automatically (24 teams), plus the 8 best 3rd-place finishers out of 12
 * groups advance to complete the Round of 32 bracket (32 teams total).
 *
 * The combination of which 8 groups produce qualifying 3rd-place teams
 * determines how those teams are slotted into the R32 bracket.
 * There are C(12, 8) = 495 possible combinations.
 *
 * Since the official FIFA matrix for the 48-team format has not been fully
 * published, this module uses a deterministic rule-based mapping system
 * that is consistent across all 495 combinations.
 */

export type GroupLetter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export const ALL_GROUPS: GroupLetter[] = [
  'A', 'B', 'C', 'D', 'E', 'F',
  'G', 'H', 'I', 'J', 'K', 'L',
];

/**
 * The 8 R32 match slots designated for 3rd-place qualifiers.
 * In each of these matches, a 3rd-place team faces a group winner.
 *
 * Slot layout (see bracket-mapping.ts for full structure):
 *   Slot 1:  1A vs 3rd-place team
 *   Slot 3:  1B vs 3rd-place team
 *   Slot 5:  1C vs 3rd-place team
 *   Slot 7:  1D vs 3rd-place team
 *   Slot 9:  1E vs 3rd-place team
 *   Slot 11: 1F vs 3rd-place team
 *   Slot 13: 1G vs 3rd-place team
 *   Slot 15: 1H vs 3rd-place team
 */
export const THIRD_PLACE_R32_SLOTS = [1, 3, 5, 7, 9, 11, 13, 15] as const;

export interface ThirdPlaceAssignment {
  /**
   * Maps each qualifying group's letter to the R32 match slot number
   * where that group's 3rd-place team will play.
   * e.g. { A: 1, B: 3, C: 5, D: 7, F: 9, G: 11, H: 13, K: 15 }
   */
  assignments: Record<string, number>;
}

/**
 * Deterministic priority table that governs how qualifying 3rd-place
 * teams are assigned to R32 slots.
 *
 * Each R32 slot has a priority-ordered list of groups. When assigning,
 * the algorithm iterates through slots in order, and for each slot picks
 * the highest-priority qualifying group that hasn't been assigned yet.
 *
 * The priority lists are designed so that:
 *  - Geographically/alphabetically close groups are spread across the bracket
 *  - No group winner faces the 3rd-place team from a nearby group when possible
 *  - The mapping is fully deterministic for any of the 495 combinations
 */
const SLOT_PREFERENCES: Record<number, GroupLetter[]> = {
  1:  ['I', 'J', 'K', 'L', 'G', 'H', 'F', 'E', 'D', 'C', 'B', 'A'],
  3:  ['G', 'H', 'I', 'J', 'K', 'L', 'E', 'F', 'C', 'D', 'A', 'B'],
  5:  ['K', 'L', 'I', 'J', 'G', 'H', 'F', 'E', 'D', 'A', 'B', 'C'],
  7:  ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'A', 'B', 'C', 'D'],
  9:  ['L', 'K', 'J', 'I', 'H', 'G', 'F', 'D', 'C', 'B', 'A', 'E'],
  11: ['C', 'D', 'A', 'B', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
  13: ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I', 'J', 'K', 'L', 'G'],
  15: ['D', 'C', 'B', 'A', 'F', 'E', 'L', 'K', 'J', 'I', 'H', 'G'],
};

/**
 * Given the 8 group letters whose 3rd-place teams qualify,
 * returns the R32 slot assignments for those teams.
 *
 * @param qualifyingGroups - Exactly 8 distinct GroupLetters
 * @returns ThirdPlaceAssignment with one entry per qualifying group
 * @throws Error if not exactly 8 unique valid group letters are provided
 *
 * @example
 * ```ts
 * const result = getThirdPlaceAssignments(['A','B','C','D','E','F','G','H']);
 * // result.assignments => { I-like mapping of groups to slots }
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

  const qualifyingSet = new Set<GroupLetter>(qualifyingGroups);
  const assigned = new Set<GroupLetter>();
  const assignments: Record<string, number> = {};

  // Greedy assignment: iterate slots in order, for each slot pick the
  // highest-priority qualifying group not yet assigned.
  for (const slot of THIRD_PLACE_R32_SLOTS) {
    const preferences = SLOT_PREFERENCES[slot];
    const chosen = preferences.find(
      (g) => qualifyingSet.has(g) && !assigned.has(g),
    );
    if (!chosen) {
      // Fallback: pick any remaining qualifying group (sorted alphabetically)
      const remaining = [...qualifyingSet]
        .filter((g) => !assigned.has(g))
        .sort();
      if (remaining.length === 0) {
        throw new Error('No remaining qualifying groups to assign');
      }
      assignments[remaining[0]] = slot;
      assigned.add(remaining[0]);
    } else {
      assignments[chosen] = slot;
      assigned.add(chosen);
    }
  }

  return { assignments };
}

/**
 * Convenience: returns the sorted 8-letter key string for a combination.
 * Useful for caching or logging.
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
 * Useful for pre-computing the full lookup table if needed.
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
