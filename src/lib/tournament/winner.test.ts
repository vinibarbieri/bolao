import { describe, it, expect } from "vitest";
import { resolveWinner } from "./winner";

const base = { homeTeamId: "H", awayTeamId: "A" };

describe("resolveWinner", () => {
  it("returns the higher-scoring team on a decisive score", () => {
    expect(resolveWinner({ ...base, homeScore: 2, awayScore: 1, isGroup: false })).toBe("H");
    expect(resolveWinner({ ...base, homeScore: 0, awayScore: 3, isGroup: false })).toBe("A");
  });

  it("returns no winner for a level group match", () => {
    expect(resolveWinner({ ...base, homeScore: 1, awayScore: 1, isGroup: true })).toBeNull();
  });

  it("uses the supplied advancing team for a level knockout match", () => {
    expect(
      resolveWinner({ ...base, homeScore: 1, awayScore: 1, isGroup: false, advancingTeamId: "A" })
    ).toBe("A");
  });

  it("rejects an advancing team that is not a participant", () => {
    expect(
      resolveWinner({ ...base, homeScore: 1, awayScore: 1, isGroup: false, advancingTeamId: "Z" })
    ).toBeNull();
  });

  it("returns no winner for a level knockout match with no advancing team", () => {
    expect(
      resolveWinner({ ...base, homeScore: 0, awayScore: 0, isGroup: false, advancingTeamId: null })
    ).toBeNull();
  });

  it("ignores the advancing team when the score is decisive", () => {
    expect(
      resolveWinner({ ...base, homeScore: 2, awayScore: 0, isGroup: false, advancingTeamId: "A" })
    ).toBe("H");
  });
});
