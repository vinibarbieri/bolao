import { describe, it, expect } from "vitest";
import { mapStage, groupLetterFrom } from "./stage-map";

describe("mapStage", () => {
  it("maps the group stage", () => {
    expect(mapStage("GROUP_STAGE")).toBe("group");
  });

  it("maps Round-of-32 under its various names", () => {
    expect(mapStage("LAST_32")).toBe("r32");
    expect(mapStage("ROUND_OF_32")).toBe("r32");
  });

  it("maps Round-of-16", () => {
    expect(mapStage("LAST_16")).toBe("r16");
    expect(mapStage("ROUND_OF_16")).toBe("r16");
  });

  it("maps quarter- and semi-finals", () => {
    expect(mapStage("QUARTER_FINALS")).toBe("qf");
    expect(mapStage("SEMI_FINALS")).toBe("sf");
  });

  it("maps third-place before final (3RD_PLACE_FINAL must be third)", () => {
    expect(mapStage("THIRD_PLACE")).toBe("third");
    expect(mapStage("3RD_PLACE_FINAL")).toBe("third");
  });

  it("maps the final", () => {
    expect(mapStage("FINAL")).toBe("final");
  });

  it("returns null for unknown stages", () => {
    expect(mapStage("PRELIMINARY")).toBeNull();
  });
});

describe("groupLetterFrom", () => {
  it("extracts the letter from GROUP_X", () => {
    expect(groupLetterFrom("GROUP_A")).toBe("A");
    expect(groupLetterFrom("GROUP L")).toBe("L");
    expect(groupLetterFrom("group_c")).toBe("C");
  });

  it("returns null for null or non-group input", () => {
    expect(groupLetterFrom(null)).toBeNull();
    expect(groupLetterFrom("FINAL")).toBeNull();
  });
});
