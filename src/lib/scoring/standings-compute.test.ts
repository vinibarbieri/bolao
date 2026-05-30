import { describe, it, expect } from "vitest";
import {
  computeStandings,
  selectBestThirds,
  type MatchResult,
  type ThirdRow,
} from "./standings-compute";

describe("computeStandings", () => {
  it("awards 3 pts for a win, 1 for a draw, and assigns positions", () => {
    // A beats B, A draws C, B beats C.
    const ms: MatchResult[] = [
      { homeTeamId: "A", awayTeamId: "B", homeScore: 2, awayScore: 0 },
      { homeTeamId: "A", awayTeamId: "C", homeScore: 1, awayScore: 1 },
      { homeTeamId: "B", awayTeamId: "C", homeScore: 3, awayScore: 0 },
    ];
    const table = computeStandings(ms);
    const a = table.find((t) => t.teamId === "A")!;
    const b = table.find((t) => t.teamId === "B")!;
    const c = table.find((t) => t.teamId === "C")!;

    expect(a.points).toBe(4); // W + D
    expect(b.points).toBe(3); // W + L
    expect(c.points).toBe(1); // D + L
    expect(a.position).toBe(1);
    expect(b.position).toBe(2);
    expect(c.position).toBe(3);
  });

  it("breaks ties by goal difference then goals for", () => {
    // X and Y both 3 pts; X has better GD; Z and W tie on GD, Y more GF.
    const ms: MatchResult[] = [
      { homeTeamId: "X", awayTeamId: "Z", homeScore: 5, awayScore: 0 },
      { homeTeamId: "Y", awayTeamId: "W", homeScore: 2, awayScore: 0 },
    ];
    const table = computeStandings(ms);
    expect(table[0].teamId).toBe("X"); // GD +5
    expect(table[1].teamId).toBe("Y"); // GD +2
  });

  it("ignores matches with missing scores", () => {
    const ms: MatchResult[] = [
      { homeTeamId: "A", awayTeamId: "B", homeScore: null, awayScore: 1 },
    ];
    expect(computeStandings(ms)).toEqual([]);
  });
});

describe("selectBestThirds", () => {
  it("selects the best 8 third-place teams by points → gd → gf", () => {
    const thirds: ThirdRow[] = Array.from({ length: 12 }, (_, i) => ({
      teamId: `T${i}`,
      points: i, // T11 best, T0 worst
      gd: 0,
      gf: 0,
    }));
    const best = selectBestThirds(thirds);
    expect(best.size).toBe(8);
    expect(best.has("T11")).toBe(true);
    expect(best.has("T4")).toBe(true); // 12 teams, top 8 => points 4..11
    expect(best.has("T3")).toBe(false);
  });

  it("applies gd then gf as tiebreakers at the cut line", () => {
    const thirds: ThirdRow[] = [
      ...Array.from({ length: 7 }, (_, i) => ({ teamId: `H${i}`, points: 9, gd: 5, gf: 5 })),
      { teamId: "IN", points: 3, gd: 2, gf: 4 },
      { teamId: "OUT", points: 3, gd: 2, gf: 2 },
    ];
    const best = selectBestThirds(thirds);
    expect(best.has("IN")).toBe(true);
    expect(best.has("OUT")).toBe(false);
  });
});
