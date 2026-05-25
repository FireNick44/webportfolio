import { describe, it, expect } from "vitest";
import {
  smoothSpeed,
  nextMode,
  type OctoMode,
  type ModeInput,
} from "./octopusMotion";

const base: ModeInput = {
  cActive: true,
  cspeed: 0,
  dist: 200,
  closing: false,
  calmMs: 0,
};

describe("smoothSpeed (EMA)", () => {
  it("eases toward the sample", () => {
    expect(smoothSpeed(0, 100, 0.2)).toBeCloseTo(20);
  });
  it("decays toward 0 for a placed cursor", () => {
    let v = 600;
    for (let i = 0; i < 40; i++) v = smoothSpeed(v, 0, 0.2);
    expect(v).toBeLessThan(1);
  });
});

describe("nextMode hysteresis", () => {
  const go = (mode: OctoMode, patch: Partial<ModeInput>) =>
    nextMode(mode, { ...base, ...patch });

  it("calm cursor nearby → curious", () => {
    expect(go("roam", { cspeed: 80, dist: 200 })).toBe("curious");
  });
  it("lunge (fast + closing, near) → flee", () => {
    expect(go("roam", { cspeed: 1200, closing: true, dist: 200 })).toBe("flee");
  });
  it("far cursor → roam", () => {
    expect(go("roam", { cspeed: 80, dist: 999 })).toBe("roam");
  });
  it("placed cursor (just moved there, not closing) does not flee", () => {
    expect(go("roam", { cspeed: 80, closing: false, dist: 150 })).toBe("curious");
  });
  it("small nudge while curious does NOT shatter it (raised threshold)", () => {
    // between LUNGE_SPEED (900) and LUNGE_SPEED*1.3 (1170)
    expect(go("curious", { cspeed: 1000, closing: true, dist: 150 })).toBe("curious");
  });
  it("a real lunge while curious still flees", () => {
    expect(go("curious", { cspeed: 1300, closing: true, dist: 150 })).toBe("flee");
  });
  it("stays fleeing while cursor still fast", () => {
    expect(go("flee", { cspeed: 800, calmMs: 1000 })).toBe("flee");
  });
  it("leaves flee only after the cursor calms for long enough", () => {
    expect(go("flee", { cspeed: 100, calmMs: 500, dist: 200 })).toBe("curious");
    expect(go("flee", { cspeed: 100, calmMs: 100 })).toBe("flee");
  });
  it("cursor gone → settle to roam", () => {
    expect(go("flee", { cActive: false })).toBe("roam");
    expect(go("curious", { cActive: false })).toBe("roam");
  });
});
