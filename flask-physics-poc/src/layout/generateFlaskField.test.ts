import { describe, it, expect } from "vitest";
import { generateFlaskField } from "./generateFlaskField";
import type { SkillEntry, LayoutConfig } from "../types/flask";

const config: LayoutConfig = {
  columnCount: 3,
  skeletonBands: 1,
  flaskSpacingX: 150,
  minFlasks: 8,
  maxFlasks: 70,
  maxPhysicsFlasks: 36,
};
const skills: SkillEntry[] = Array.from({ length: 22 }, (_, i) => ({
  id: `s${i}`,
  name: `S${i}`,
  svgPath: `/skills/s${i}.svg`,
  priority: 22 - i,
}));
const base = { height: 800, isMobile: false, skills, seed: 1, config };

describe("generateFlaskField (desktop)", () => {
  it("produces more flasks on wider screens (constant density)", () => {
    const narrow = generateFlaskField({ ...base, width: 600 }).length;
    const wide = generateFlaskField({ ...base, width: 2400 }).length;
    expect(wide).toBeGreaterThan(narrow);
  });

  it("is deterministic for a fixed seed + size", () => {
    const a = generateFlaskField({ ...base, width: 1280 });
    const b = generateFlaskField({ ...base, width: 1280 });
    expect(a).toEqual(b);
  });

  it("clamps to maxFlasks on ultrawide", () => {
    const n = generateFlaskField({ ...base, width: 100000 }).length;
    expect(n).toBeLessThanOrEqual(config.maxFlasks);
  });

  it("never exceeds the physics body budget", () => {
    const f = generateFlaskField({ ...base, width: 100000 });
    expect(f.filter((x) => !x.isSkeleton).length).toBeLessThanOrEqual(
      config.maxPhysicsFlasks
    );
  });

  it("marks back bands as skeletons", () => {
    const f = generateFlaskField({ ...base, width: 1280 });
    expect(
      f
        .filter((x) => x.layer >= config.columnCount - config.skeletonBands)
        .every((x) => x.isSkeleton)
    ).toBe(true);
  });

  it("fills overflow slots with plain (icon-less) flasks, each skill once", () => {
    const f = generateFlaskField({ ...base, width: 2400 });
    const icons = f.filter((x) => x.skillIcon).map((x) => x.skillIcon);
    expect(new Set(icons).size).toBe(icons.length); // no duplicate icons
    expect(f.some((x) => !x.skillIcon)).toBe(true); // some plain flasks exist
  });

  it("gives highest-priority skills to the front band and a higher hang", () => {
    const f = generateFlaskField({ ...base, width: 1280 });
    const front = f.filter((x) => x.layer === 0 && x.skillIcon);
    const back = f.filter((x) => x.layer === 1 && x.skillIcon);
    const avg = (xs: typeof f) =>
      xs.reduce((s, x) => s + x.segments, 0) / Math.max(1, xs.length);
    expect(avg(front)).toBeLessThanOrEqual(avg(back));
  });

  it("omits lowest-priority skills when there are fewer slots than skills", () => {
    const f = generateFlaskField({ ...base, width: 320 });
    expect(f.length).toBeLessThan(skills.length);
    const shownIcons = f.map((x) => x.skillIcon).filter(Boolean) as string[];
    expect(shownIcons.some((s) => s.includes("s0."))).toBe(true); // top priority shown
  });

  it("respects pixel spacing within a band", () => {
    const width = 1280;
    const f = generateFlaskField({ ...base, width });
    for (let layer = 0; layer < config.columnCount; layer++) {
      const xs = f
        .filter((x) => x.layer === layer)
        .map((x) => x.xPct * width)
        .sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(config.flaskSpacingX - 1);
      }
    }
  });
});

describe("generateFlaskField (mobile)", () => {
  const m = { width: 390, height: 844, isMobile: true, skills, seed: 1, config };
  it("distributes anchors down the height in rows (varied anchorY)", () => {
    const f = generateFlaskField(m);
    const ys = new Set(f.map((x) => x.anchorY));
    expect(ys.size).toBeGreaterThan(1); // not all anchored at the top
  });
  it("is deterministic", () => {
    expect(generateFlaskField(m)).toEqual(generateFlaskField(m));
  });
  it("produces a non-empty, reasonably small field", () => {
    const n = generateFlaskField(m).length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(config.maxFlasks);
  });
});
