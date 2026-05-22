import { describe, it, expect } from "vitest";
import { resolveQuality, applyFpsDowngrade, QUALITY_PRESETS } from "./fieldConfig";

describe("resolveQuality", () => {
  it("reduced-motion forces low", () => {
    expect(resolveQuality({ cores: 16, memory: 16, prefersReducedMotion: true, isMobile: false })).toBe("low");
  });
  it("few cores → low", () => {
    expect(resolveQuality({ cores: 2, memory: 8, prefersReducedMotion: false, isMobile: false })).toBe("low");
  });
  it("mid cores → medium", () => {
    expect(resolveQuality({ cores: 6, memory: 8, prefersReducedMotion: false, isMobile: false })).toBe("medium");
  });
  it("many cores + memory → high", () => {
    expect(resolveQuality({ cores: 12, memory: 16, prefersReducedMotion: false, isMobile: false })).toBe("high");
  });
  it("low memory caps to medium even with many cores", () => {
    expect(resolveQuality({ cores: 12, memory: 3, prefersReducedMotion: false, isMobile: false })).not.toBe("high");
  });
});

describe("applyFpsDowngrade", () => {
  it("drops one level when fps below threshold", () => {
    expect(applyFpsDowngrade("high", 30)).toBe("medium");
    expect(applyFpsDowngrade("medium", 30)).toBe("low");
    expect(applyFpsDowngrade("low", 30)).toBe("low");
  });
  it("keeps level when fps healthy", () => {
    expect(applyFpsDowngrade("high", 58)).toBe("high");
  });
});

describe("QUALITY_PRESETS", () => {
  it("has low/medium/high desktop configs", () => {
    expect(QUALITY_PRESETS.low.maxPhysicsFlasks).toBeLessThan(QUALITY_PRESETS.medium.maxPhysicsFlasks);
    expect(QUALITY_PRESETS.high.maxPhysicsFlasks).toBeGreaterThan(QUALITY_PRESETS.medium.maxPhysicsFlasks);
  });
});
