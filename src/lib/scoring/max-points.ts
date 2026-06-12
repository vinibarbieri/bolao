// Full-tournament maximum points per category — the score a perfect predictor
// earns. Used as the fixed denominator for the accuracy bars on the compare
// page's score breakdown. Derived from the live scoring POINTS tables so the
// ceilings cannot drift out of sync with how points are actually awarded.
import { POINTS as GROUP_POINTS } from "./group-scoring";
import { POINTS as KNOCKOUT_POINTS } from "./knockout-scoring";
import { AWARD_POINTS } from "./award-scoring";

// 48 teams, 12 groups of 4. Every team has an exact finishing position; the top
// two of each group advance; eight best third-place teams also qualify.
const GROUP_MAX =
  48 * GROUP_POINTS.EXACT_POSITION +
  24 * GROUP_POINTS.CORRECT_ADVANCE +
  8 * GROUP_POINTS.CORRECT_THIRD_QUALIFIES;

// Teams reaching each knockout round in a 32-team bracket: 16 reach R16, 8 the
// QF, 4 the SF, 2 the final, 1 is champion, and 2 contest the third-place match.
const KNOCKOUT_MAX =
  16 * KNOCKOUT_POINTS.r16 +
  8 * KNOCKOUT_POINTS.qf +
  4 * KNOCKOUT_POINTS.sf +
  2 * KNOCKOUT_POINTS.final +
  1 * KNOCKOUT_POINTS.champion +
  2 * KNOCKOUT_POINTS.third;

// Each individual award can be predicted correctly exactly once.
const AWARDS_MAX = Object.values(AWARD_POINTS).reduce((sum, p) => sum + p, 0);

// Golden Trio is intentionally absent: its theoretical ceiling (one of your
// three picks winning MOTM in every match) is too high to make a useful bar, so
// the UI shows raw points + MOTM hits for that category instead.
export const MAX_POINTS = {
  group: GROUP_MAX,
  knockout: KNOCKOUT_MAX,
  awards: AWARDS_MAX,
} as const;

export type ScoredCategory = keyof typeof MAX_POINTS;
