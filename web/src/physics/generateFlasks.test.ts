import { describe, it, expect } from "vitest";
import { generateFlasks } from "./generateFlasks";
import type { FieldConfig } from "./fieldConfig";

const FIELD: FieldConfig = {
  flaskCount: 30, maxPhysicsFlasks: 18,
  layerScale: [1.0, 0.82, 0.66, 0.5, 0.36],
  skeletonBands: 2, segmentRange: [3, 11], layout: "field",
};
const skills = Array.from({ length: 22 }, (_, i) => `/skills/s${i}.svg`);
const vp = { width: 1440, height: 900 };

describe("generateFlasks (field)", () => {
  it("is deterministic for the same seed", () => {
    const a = generateFlasks(FIELD, vp, skills, 42);
    const b = generateFlasks(FIELD, vp, skills, 42);
    expect(a).toEqual(b);
  });

  it("uses layerScale for each flask's scale", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    for (const x of f) expect(x.scale).toBe(FIELD.layerScale[x.layer]);
  });

  it("marks the back skeletonBands tiers as skeletons", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const firstSkelTier = FIELD.layerScale.length - FIELD.skeletonBands; // 3
    for (const x of f) {
      if (x.layer >= firstSkelTier) expect(x.isSkeleton).toBe(true);
    }
  });

  it("never gives skeletons an icon", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    for (const x of f) if (x.isSkeleton) expect(x.skillIcon).toBeUndefined();
  });

  it("caps physics flasks at maxPhysicsFlasks (overflow → skeleton)", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    expect(f.filter((x) => !x.isSkeleton).length).toBeLessThanOrEqual(FIELD.maxPhysicsFlasks);
  });

  it("assigns icons only up to the skill count", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    expect(f.filter((x) => x.skillIcon).length).toBeLessThanOrEqual(skills.length);
  });

  it("chain length (segments) grows from front tier to back tier", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const avg = (layer: number) => {
      const xs = f.filter((x) => x.layer === layer);
      return xs.reduce((s, x) => s + x.segments, 0) / Math.max(1, xs.length);
    };
    expect(avg(0)).toBeLessThan(avg(2));
    expect(avg(2)).toBeLessThan(avg(4));
  });
});

describe("generateFlasks (column / mobile)", () => {
  const COLUMN: FieldConfig = {
    flaskCount: 8, maxPhysicsFlasks: 4,
    layerScale: [1.0, 0.5, 0.36], skeletonBands: 2,
    segmentRange: [4, 5], layout: "column",
  };
  it("foreground (tier 0) is interactive, others are background skeletons", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 844 }, skills, 42);
    const fg = f.filter((x) => x.layer === 0);
    const bg = f.filter((x) => x.layer > 0);
    expect(fg.length).toBeGreaterThan(0);
    expect(fg.every((x) => !x.isSkeleton)).toBe(true);
    expect(bg.every((x) => x.isSkeleton)).toBe(true);
  });
  it("foreground flasks are centered horizontally (column)", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 844 }, skills, 42);
    for (const x of f.filter((x) => x.layer === 0)) {
      expect(Math.abs(x.xPct - 0.5)).toBeLessThan(0.15);
    }
  });
});
