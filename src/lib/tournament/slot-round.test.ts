import { describe, it, expect } from "vitest";
import { slotToRound, deriveKnockoutRounds } from "./slot-round";

describe("slotToRound", () => {
  it("maps R32 slots 1-16", () => {
    for (let s = 1; s <= 16; s++) expect(slotToRound(s)).toBe("r32");
  });

  it("maps R16 slots 17-24", () => {
    for (let s = 17; s <= 24; s++) expect(slotToRound(s)).toBe("r16");
  });

  it("maps QF slots 25-28", () => {
    for (let s = 25; s <= 28; s++) expect(slotToRound(s)).toBe("qf");
  });

  it("maps SF slots 29-30", () => {
    expect(slotToRound(29)).toBe("sf");
    expect(slotToRound(30)).toBe("sf");
  });

  it("maps slot 31 to the third-place match (not the final)", () => {
    expect(slotToRound(31)).toBe("third");
  });

  it("maps slot 32 to the final (not the third-place match)", () => {
    expect(slotToRound(32)).toBe("final");
  });

  it("returns null for out-of-range slots", () => {
    expect(slotToRound(0)).toBeNull();
    expect(slotToRound(33)).toBeNull();
  });
});

describe("deriveKnockoutRounds", () => {
  it("emits a champion row for the slot-32 team alongside final", () => {
    const rows = deriveKnockoutRounds([{ bracketSlot: 32, teamId: "BRA" }]);
    const rounds = rows.filter((r) => r.teamId === "BRA").map((r) => r.round).sort();
    expect(rounds).toEqual(["champion", "final"]);
  });

  it("does not emit champion for the third-place team", () => {
    const rows = deriveKnockoutRounds([{ bracketSlot: 31, teamId: "FRA" }]);
    expect(rows.map((r) => r.round)).toEqual(["third"]);
  });

  it("collects the full path of a champion to sf/final/champion", () => {
    // A champion is picked across the SF (29), Final (32) slots.
    const rows = deriveKnockoutRounds([
      { bracketSlot: 29, teamId: "ARG" },
      { bracketSlot: 32, teamId: "ARG" },
    ]);
    const rounds = rows.filter((r) => r.teamId === "ARG").map((r) => r.round).sort();
    expect(rounds).toEqual(["champion", "final", "sf"]);
  });

  it("ignores out-of-range slots", () => {
    expect(deriveKnockoutRounds([{ bracketSlot: 99, teamId: "X" }])).toEqual([]);
  });
});
