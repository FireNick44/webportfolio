import { describe, it, expect } from "vitest";
import { FIELD_BY_TIER, fieldConfigFor } from "./fieldConfig";
import { generateFlasks } from "./generateFlasks";
import { MAX_PHYSICS_SEGMENTS } from "./constants";

describe("FIELD_BY_TIER", () => {
  it("off has no physics flasks (static rack)", () => {
    expect(FIELD_BY_TIER.off.maxPhysicsFlasks).toBe(0);
  });
  it("physics budget grows low < medium < high", () => {
    expect(FIELD_BY_TIER.low.maxPhysicsFlasks).toBeLessThan(FIELD_BY_TIER.medium.maxPhysicsFlasks);
    expect(FIELD_BY_TIER.medium.maxPhysicsFlasks).toBeLessThan(FIELD_BY_TIER.high.maxPhysicsFlasks);
  });
});

describe("fieldConfigFor", () => {
  it("desktop uses the tier's field config", () => {
    expect(fieldConfigFor("high", false)).toBe(FIELD_BY_TIER.high);
  });
  it("mobile uses the column layout", () => {
    expect(fieldConfigFor("medium", true).layout).toBe("column");
  });
  it("off forces no physics on desktop and mobile", () => {
    expect(fieldConfigFor("off", false).maxPhysicsFlasks).toBe(0);
    expect(fieldConfigFor("off", true).maxPhysicsFlasks).toBe(0);
  });
});

describe("off tier → fully static rack", () => {
  const skills = Array.from({ length: 22 }, (_, i) => `/skills/s${i}.svg`);
  it("every generated flask is a skeleton when tier is off", () => {
    const f = generateFlasks(fieldConfigFor("off", false), { width: 1440, height: 900 }, skills, 42);
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((x) => x.isSkeleton)).toBe(true);
  });
});

describe("fieldConfigFor — maxPhysicsSegments per tier", () => {
  it("high tier simulates every chain link (no static top)", () => {
    const cfg = fieldConfigFor("high", false);
    expect(cfg.maxPhysicsSegments).toBe(Number.POSITIVE_INFINITY);
  });

  it("medium tier keeps the default cap", () => {
    const cfg = fieldConfigFor("medium", false);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });

  it("low tier keeps the default cap", () => {
    const cfg = fieldConfigFor("low", false);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });

  it("off tier keeps the default cap (irrelevant but defined)", () => {
    const cfg = fieldConfigFor("off", false);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });

  it("mobile keeps the default cap regardless of tier", () => {
    const cfg = fieldConfigFor("high", true);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });
});
