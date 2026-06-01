import { describe, it, expect } from "vitest";
import {
  reconcileBracketPicks,
  feederSlots,
  r32HomeKey,
  r32AwayKey,
} from "./reconcile-bracket";

describe("feederSlots", () => {
  it("returns R32 home/away keys for R32 slots", () => {
    expect(feederSlots(1, {})).toEqual([r32HomeKey(1), r32AwayKey(1)]);
    expect(feederSlots(16, {})).toEqual([r32HomeKey(16), r32AwayKey(16)]);
  });

  it("returns source slots for R16/QF/SF/Final", () => {
    expect(feederSlots(17, {})).toEqual([1, 2]); // R16
    expect(feederSlots(25, {})).toEqual([17, 18]); // QF
    expect(feederSlots(29, {})).toEqual([25, 26]); // SF
    expect(feederSlots(32, {})).toEqual([29, 30]); // Final
  });

  it("resolves third-place feeders as the two SF losers", () => {
    // SF 29 sources [25,26], SF 30 sources [27,28].
    // 29 winner = team in slot 25 -> loser is slot 26.
    // 30 winner = team in slot 28 -> loser is slot 27.
    const picks = {
      25: "A",
      26: "B",
      27: "C",
      28: "D",
      29: "A",
      30: "D",
    };
    expect(feederSlots(31, picks)).toEqual([26, 27]);
  });

  it("returns sentinels for undetermined SF losers", () => {
    const [s1, s2] = feederSlots(31, {});
    expect(s1).toBeLessThan(0);
    expect(s2).toBeLessThan(0);
  });
});

describe("reconcileBracketPicks", () => {
  it("keeps a winner that still feeds its slot", () => {
    const r32Base = { [r32HomeKey(1)]: "SEN", [r32AwayKey(1)]: "NED" };
    const saved = { 1: "SEN", 17: "SEN" };
    const { kept, prunedSlots } = reconcileBracketPicks(r32Base, saved);
    expect(prunedSlots).toEqual([]);
    expect(kept[1]).toBe("SEN");
  });

  it("prunes a winner no longer in its R32 slot", () => {
    // Senegal used to be the home team of slot 1 and advanced; now NOR is there.
    const r32Base = { [r32HomeKey(1)]: "NOR", [r32AwayKey(1)]: "NED" };
    const saved = { 1: "SEN", 17: "SEN" };
    const { kept, prunedSlots } = reconcileBracketPicks(r32Base, saved);
    expect(prunedSlots).toContain(1);
    expect(kept[1]).toBeUndefined();
  });

  it("cascades pruning to downstream rounds", () => {
    // Slot 1 winner is stale -> R16(17), QF(25), SF(29), Final(32) all referenced
    // it and must be pruned too.
    const r32Base = {
      [r32HomeKey(1)]: "NOR",
      [r32AwayKey(1)]: "NED",
    };
    const saved = { 1: "SEN", 17: "SEN", 25: "SEN", 29: "SEN", 32: "SEN" };
    const { kept, prunedSlots } = reconcileBracketPicks(r32Base, saved);
    expect(prunedSlots).toEqual(expect.arrayContaining([1, 17, 25, 29, 32]));
    expect(Object.keys(kept)).toHaveLength(0);
  });

  it("keeps an unaffected branch when another branch is pruned", () => {
    const r32Base = {
      [r32HomeKey(1)]: "NOR", // SEN displaced here
      [r32AwayKey(1)]: "NED",
      [r32HomeKey(2)]: "BRA",
      [r32AwayKey(2)]: "ARG",
    };
    const saved = { 1: "SEN", 2: "BRA" };
    const { kept, prunedSlots } = reconcileBracketPicks(r32Base, saved);
    expect(prunedSlots).toEqual([1]);
    expect(kept[2]).toBe("BRA");
  });

  it("2nd<->3rd swap: stale advancement pruned, valid R32 base untouched", () => {
    // Old bracket advanced SEN (then a runner-up) from slot 17. After the swap
    // SEN is a 3rd-place team seeded into a different R32 slot (e.g. slot 4),
    // so its old slot-17 advancement is invalid.
    const r32Base = {
      [r32HomeKey(1)]: "NOR", // NOR now the runner-up here
      [r32AwayKey(1)]: "NED",
      [r32HomeKey(4)]: "SEN", // SEN now seeded here as 3rd place
      [r32AwayKey(4)]: "GHA",
    };
    const saved = { 1: "SEN", 17: "SEN" };
    const { kept, prunedSlots } = reconcileBracketPicks(r32Base, saved);
    expect(prunedSlots).toEqual(expect.arrayContaining([1, 17]));
    expect(kept[1]).toBeUndefined();
    expect(kept[17]).toBeUndefined();
  });
});
