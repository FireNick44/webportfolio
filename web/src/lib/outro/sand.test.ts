import { describe, it, expect } from "vitest";
import { generateSand, SAND_PALETTE } from "./sand";

describe("generateSand", () => {
  it("is deterministic for the same seed", () => {
    expect(generateSand(23, 40, 5)).toEqual(generateSand(23, 40, 5));
  });

  it("has the requested dimensions (rows × cols)", () => {
    const grid = generateSand(23, 40, 5);
    expect(grid).toHaveLength(5);
    for (const row of grid) expect(row).toHaveLength(40);
  });

  it("only uses colors from the palette", () => {
    const allowed = new Set(SAND_PALETTE);
    for (const row of generateSand(23, 40, 5)) {
      for (const c of row) expect(allowed.has(c)).toBe(true);
    }
  });
});
