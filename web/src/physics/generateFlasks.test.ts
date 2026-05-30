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
  flaskCount: 30, maxPhysicsFlasks: 18, maxPhysicsSegments: 6,
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

  it("makes every icon flask interactive (no physics cap on icons in field)", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    // every flask that shows an icon is a physics flask…
    for (const x of f) if (x.skillIcon) expect(x.isSkeleton).toBe(false);
    // …and every physics flask carries an icon (icon-less foreground → skeleton)
    for (const x of f) if (!x.isSkeleton) expect(x.skillIcon).toBeDefined();
  });

  it("keeps the whole field static when motion is off (icons stay, no physics)", () => {
    const off: FieldConfig = { ...FIELD, maxPhysicsFlasks: 0 };
    const f = generateFlasks(off, vp, skills, 42);
    expect(f.every((x) => x.isSkeleton)).toBe(true);
    expect(f.some((x) => x.skillIcon)).toBe(true); // icons still shown, just static
  });

  it("adds bgSkeletons as extra icon-less ghosts that reach the upper band", () => {
    const base = generateFlasks(FIELD, vp, skills, 42);
    const withBg = generateFlasks({ ...FIELD, bgSkeletons: 14 }, vp, skills, 42);
    expect(withBg.length).toBe(base.length + 14);
    const firstSkelTier = FIELD.layerScale.length - FIELD.skeletonBands;
    const ghosts = withBg.filter((x) => x.layer >= firstSkelTier);
    expect(ghosts.every((x) => x.isSkeleton && x.skillIcon === undefined)).toBe(true);
    // background depth now reaches the top, not just the deep bottom.
    // Chain length is screen-space here = chainLength(segments) * scale (chain
    // bodies are uniformly scaled per layer; see createChainBodies.ts).
    const depth = (x: (typeof withBg)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale;
    expect(ghosts.some((x) => depth(x) < 0.45 * vp.height)).toBe(true);
  });

  it("assigns icons only up to the skill count", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    expect(f.filter((x) => x.skillIcon).length).toBeLessThanOrEqual(skills.length);
  });

  it("chain length grows with how deep the flask body hangs (depth, not tier)", () => {
    const big: FieldConfig = { ...FIELD, flaskCount: 200, maxPhysicsFlasks: 200 };
    const f = generateFlasks(big, vp, skills, 42);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    const avg = (xs: typeof f) =>
      xs.reduce((s, x) => s + x.segments, 0) / Math.max(1, xs.length);
    const shallow = f.filter((x) => bodyY(x) < 0.4 * vp.height);
    const deep = f.filter((x) => bodyY(x) > 0.7 * vp.height);
    expect(avg(shallow)).toBeLessThan(avg(deep));
  });

  it("orders flasks back-to-front by depth (lower bodies render behind)", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const depth = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale;
    // within a layer, earlier (rendered-first / behind) entries hang lower
    for (let i = 1; i < f.length; i++) {
      if (f[i].layer !== f[i - 1].layer) continue;
      expect(depth(f[i - 1])).toBeGreaterThanOrEqual(depth(f[i]) - 1e-6);
    }
  });
});

describe("generateFlasks (column / mobile)", () => {
  const COLUMN: FieldConfig = {
    flaskCount: 28, maxPhysicsFlasks: 4, maxPhysicsSegments: 6,
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

  it("keeps every chain top hidden behind the wave — no mid-air chains", () => {
    // incl. bg skeletons, and on a TALL viewport where the old clamp let deep
    // skeleton chains start in mid-air (anchorY went positive). Regression guard.
    for (const view of [vp, { width: 1440, height: 1440 }]) {
      const f = generateFlasks({ ...FIELD, bgSkeletons: 14 }, view, skills, 42);
      for (const x of f) expect(x.anchorY).toBeLessThanOrEqual(TOP_LINE.floorY);
    }
  });

  it("spreads flask bodies widely down the section (not one row)", () => {
    const big: FieldConfig = { ...FIELD, flaskCount: 240, maxPhysicsFlasks: 240 };
    const f = generateFlasks(big, vp, skills, 42);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    const ys = f.map(bodyY).sort((a, b) => a - b);
    const median = ys[Math.floor(ys.length / 2)];
    // The bulk must NOT sit within a narrow band around the median (a visible
    // row); a wide vertical spread keeps far fewer than half near it.
    const nearMedian = ys.filter((y) => Math.abs(y - median) <= 20).length;
    expect(nearMedian / ys.length).toBeLessThan(0.5);
    // ...and bodies span most of the section height.
    expect(ys[ys.length - 1] - ys[0]).toBeGreaterThan(0.5 * vp.height);
  });

  it("fills the lower third of the section (no wasted bottom)", () => {
    const f = generateFlasks({ ...FIELD, bgSkeletons: 14 }, vp, skills, 42);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    expect(f.some((x) => bodyY(x) > 0.66 * vp.height)).toBe(true);
  });

  it("mixes flask sizes across heights — big flasks hang high AND low", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    const big = f.filter((x) => x.scale >= 0.82); // front (large) tiers
    expect(big.some((x) => bodyY(x) < 0.4 * vp.height)).toBe(true);
    expect(big.some((x) => bodyY(x) > 0.6 * vp.height)).toBe(true);
  });

  it("keeps flask bodies clear of the top & bottom wave bands (given a wave height)", () => {
    const waveH = 130;
    const f = generateFlasks(FIELD, vp, skills, 42, undefined, waveH);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    for (const x of f) {
      expect(bodyY(x)).toBeGreaterThanOrEqual(waveH); // below the top wave
      expect(bodyY(x)).toBeLessThanOrEqual(vp.height - waveH + 1e-6); // above bottom wave
    }
  });

  it("paints higher physics flasks in front, all skeletons behind them", () => {
    const f = generateFlasks({ ...FIELD, bgSkeletons: 10 }, vp, skills, 42);
    const bodyY = (x: (typeof f)[number]) =>
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
    const firstPhysics = f.findIndex((x) => !x.isSkeleton);
    expect(firstPhysics).toBeGreaterThan(0); // skeletons lead (painted behind)
    expect(f.slice(0, firstPhysics).every((x) => x.isSkeleton)).toBe(true);
    // no coverSkeletons here → nothing skeletal after the physics block
    expect(f.slice(firstPhysics).some((x) => x.isSkeleton)).toBe(false);
    const physics = f.filter((x) => !x.isSkeleton);
    for (let i = 1; i < physics.length; i++) {
      // later in DOM = painted on top = higher on screen (smaller bodyY)
      expect(bodyY(physics[i])).toBeLessThanOrEqual(bodyY(physics[i - 1]) + 1e-6);
    }
  });

  it("adds coverSkeletons as icon-less flasks BEHIND the physics flasks", () => {
    const base = generateFlasks(FIELD, vp, skills, 42);
    const f = generateFlasks({ ...FIELD, coverSkeletons: 6 }, vp, skills, 42);
    // ≤ requested — the anti-overlap retry may give up on a bin rather than
    // pile a cover flask on top of an existing placement. At this density (6
    // covers, vp 1440×900) all 6 should fit; loosen if the field gets denser.
    expect(f.length).toBeGreaterThan(base.length);
    expect(f.length).toBeLessThanOrEqual(base.length + 6);
    // covers are the only layer-0 skeletons (foreground tier, no icon)
    const covers = f.filter((x) => x.isSkeleton && x.layer === 0);
    expect(covers.length).toBeGreaterThan(0);
    expect(covers.length).toBeLessThanOrEqual(6);
    for (const c of covers) expect(c.skillIcon).toBeUndefined();
    // every cover paints before every physics flask (i.e. behind them)
    const lastCoverIdx = Math.max(...covers.map((c) => f.indexOf(c)));
    const firstPhysicsIdx = f.findIndex((x) => !x.isSkeleton);
    expect(lastCoverIdx).toBeLessThan(firstPhysicsIdx);
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
      x.anchorY + chainLength(x.segments) * x.scale + (FLASK_HITBOX_HEIGHT * x.scale) / 2;
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
