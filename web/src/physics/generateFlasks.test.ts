import { describe, it, expect } from "vitest";
import { generateFlasks, chainLength } from "./generateFlasks";
import type { FieldConfig } from "./fieldConfig";
import {
  TOP_LINE,
  MIN_SAME_LAYER_DISTANCE_PCT,
  FLASK_HITBOX_WIDTH,
  FLASK_HITBOX_HEIGHT,
} from "./constants";

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

  it("orders flasks back-to-front by depth (lower bodies render behind)", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const depth = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments);
    // within a layer, earlier (rendered-first / behind) entries hang lower
    for (let i = 1; i < f.length; i++) {
      if (f[i].layer !== f[i - 1].layer) continue;
      expect(depth(f[i - 1])).toBeGreaterThanOrEqual(depth(f[i]) - 1e-6);
    }
  });
});

describe("generateFlasks (column / mobile)", () => {
  const COLUMN: FieldConfig = {
    flaskCount: 28, maxPhysicsFlasks: 4,
    layerScale: [0.62, 0.4, 0.3], skeletonBands: 2,
    segmentRange: [4, 18], layout: "column",
  };
  it("shows a skill on every foreground flask; back tiers are icon-less", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 1800 }, skills, 42);
    const fg = f.filter((x) => x.layer === 0);
    const bg = f.filter((x) => x.layer > 0);
    expect(fg.length).toBe(skills.length); // one foreground flask per skill
    expect(fg.every((x) => x.skillIcon !== undefined)).toBe(true);
    expect(bg.length).toBeGreaterThan(0);
    expect(bg.every((x) => x.isSkeleton && x.skillIcon === undefined)).toBe(true);
  });

  it("caps interactive (physics) foreground flasks at maxPhysicsFlasks", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 1800 }, skills, 42);
    const physics = f.filter((x) => x.layer === 0 && !x.isSkeleton);
    expect(physics.length).toBeLessThanOrEqual(COLUMN.maxPhysicsFlasks);
    expect(physics.length).toBeGreaterThan(0);
  });
  it("scatters foreground across varied x (no rigid columns)", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 1800 }, skills, 42);
    const xs = f.filter((x) => x.layer === 0).map((x) => Math.round(x.xPct * 100));
    // random placement → many distinct x positions, not a few fixed columns
    expect(new Set(xs).size).toBeGreaterThan(8);
  });
});

describe("generateFlasks (field randomness)", () => {
  it("varies anchorY across flasks instead of one flat top line", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const uniq = new Set(f.map((x) => x.anchorY));
    expect(uniq.size).toBeGreaterThan(5);
  });

  it("clamps anchorY to the safe (wave-masked) band", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    for (const x of f) {
      expect(x.anchorY).toBeGreaterThanOrEqual(TOP_LINE.ceilY);
      expect(x.anchorY).toBeLessThanOrEqual(TOP_LINE.floorY);
    }
  });

  it("spreads anchorY widely instead of clustering on a line", () => {
    const big: FieldConfig = { ...FIELD, flaskCount: 240, maxPhysicsFlasks: 240 };
    const f = generateFlasks(big, vp, skills, 42);
    const ys = f.map((x) => x.anchorY).sort((a, b) => a - b);
    const median = ys[Math.floor(ys.length / 2)];
    // The bulk must NOT sit within a narrow band around the median (that would
    // be a visible row); a wide spread keeps far fewer than half near it.
    const nearMedian = ys.filter((y) => Math.abs(y - median) <= 20).length;
    expect(nearMedian / ys.length).toBeLessThan(0.5);
    // ...and the overall range is wide.
    expect(ys[ys.length - 1] - ys[0]).toBeGreaterThan(80);
  });

  it("returns every flask (no silent drops) when the field has room", () => {
    const sparse: FieldConfig = { ...FIELD, flaskCount: 10, maxPhysicsFlasks: 10 };
    const f = generateFlasks(sparse, vp, skills, 42);
    expect(f.length).toBe(10);
  });

  it("never overlaps flask bodies; same-layer columns stay apart (sparse)", () => {
    const sparse: FieldConfig = { ...FIELD, flaskCount: 12, maxPhysicsFlasks: 12 };
    const f = generateFlasks(sparse, vp, skills, 42);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) {
        const a = f[i];
        const b = f[j];
        if (a.layer === b.layer) {
          expect(Math.abs(a.xPct - b.xPct)).toBeGreaterThanOrEqual(
            MIN_SAME_LAYER_DISTANCE_PCT - 1e-9
          );
        }
        // Physical bodies (hitboxes) must not overlap in BOTH axes — a property
        // independent of the looser visual BODY_OVERLAP_PAD the impl tunes.
        const dx = Math.abs(a.xPct - b.xPct) * vp.width;
        const dy = Math.abs(bodyY(a) - bodyY(b));
        const minDx = (FLASK_HITBOX_WIDTH * a.scale + FLASK_HITBOX_WIDTH * b.scale) / 2;
        const minDy = (FLASK_HITBOX_HEIGHT * a.scale + FLASK_HITBOX_HEIGHT * b.scale) / 2;
        expect(dx >= minDx || dy >= minDy).toBe(true);
      }
    }
  });

  it("varies chain length within a layer", () => {
    const big: FieldConfig = { ...FIELD, flaskCount: 200, maxPhysicsFlasks: 200 };
    const f = generateFlasks(big, vp, skills, 42);
    const layer2 = f.filter((x) => x.layer === 2).map((x) => x.segments);
    const range = Math.max(...layer2) - Math.min(...layer2);
    expect(range).toBeGreaterThanOrEqual(4);
  });
});
