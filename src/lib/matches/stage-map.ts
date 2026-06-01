/**
 * Pure mapping from football-data.org stage / group strings to local values.
 * No DB access so it is unit-testable in isolation.
 */

export type LocalStage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

// Defensive: the 48-team format's Round-of-32 may surface under a few names
// ("LAST_32", "ROUND_OF_32"), so match on the digits / keywords rather than an
// exact enum string. Order matters — check "THIRD" before "FINAL".
export function mapStage(apiStage: string): LocalStage | null {
  const s = apiStage.toUpperCase();
  if (s.includes("GROUP")) return "group";
  if (s.includes("32")) return "r32";
  if (s.includes("16")) return "r16";
  if (s.includes("QUARTER")) return "qf";
  if (s.includes("SEMI")) return "sf";
  if (s.includes("THIRD") || s.includes("3RD")) return "third";
  if (s.includes("FINAL")) return "final";
  return null;
}

export function groupLetterFrom(apiGroup: string | null): string | null {
  if (!apiGroup) return null;
  const m = apiGroup.toUpperCase().match(/GROUP[_\s]?([A-L])/);
  return m ? m[1] : null;
}
