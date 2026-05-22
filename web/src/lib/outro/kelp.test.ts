import { describe, it, expect } from "vitest";
import { generateKelp, KELP_PALETTE } from "./kelp";

describe("generateKelp", () => {
  it("is deterministic for the same seed", () => {
    expect(generateKelp(11, 6)).toEqual(generateKelp(11, 6));
  });

  it("produces exactly `count` strands", () => {
    expect(generateKelp(11, 6)).toHaveLength(6);
  });

  it("gives each strand 3–4 segments of consistent grid width", () => {
    for (const s of generateKelp(11, 6)) {
      expect(s.segments.length).toBeGreaterThanOrEqual(3);
      expect(s.segments.length).toBeLessThanOrEqual(4);
      for (const grid of s.segments) {
        for (const row of grid) expect(row).toHaveLength(s.cols);
      }
    }
  });

  it("only uses palette colors or transparent", () => {
    const allowed = new Set([...KELP_PALETTE, "transparent"]);
    for (const s of generateKelp(11, 6)) {
      for (const grid of s.segments) {
        for (const row of grid) for (const c of row) expect(allowed.has(c)).toBe(true);
      }
    }
  });

  it("positions strands within the floor (leftPct 0..100)", () => {
    for (const s of generateKelp(11, 6)) {
      expect(s.leftPct).toBeGreaterThanOrEqual(0);
      expect(s.leftPct).toBeLessThanOrEqual(100);
    }
  });

  it("varies strand scale within range for a denser, layered look", () => {
    const strands = generateKelp(11, 12);
    for (const s of strands) {
      expect(s.scale).toBeGreaterThanOrEqual(0.6);
      expect(s.scale).toBeLessThanOrEqual(1.5);
    }
    expect(new Set(strands.map((s) => s.scale)).size).toBeGreaterThan(1);
  });
});
