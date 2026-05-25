import { describe, it, expect } from "vitest";
import {
  smoothSpeed,
  nextMode,
  type OctoMode,
  type ModeInput,
} from "./octopusMotion";

// Default: cursor present, still, settled long enough, not spooked.
const base: ModeInput = {
  cActive: true,
  cspeed: 0,
  dist: 200,
  closing: false,
  calmMs: 2000,
  spooked: false,
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

describe("nextMode hysteresis + spook delay", () => {
  const go = (mode: OctoMode, patch: Partial<ModeInput>) =>
    nextMode(mode, { ...base, ...patch });

  it("calm + settled + not spooked → curious", () => {
    expect(go("roam", { cspeed: 80 })).toBe("curious");
  });
  it("calm but NOT settled long enough → roam (waits for the delay)", () => {
    expect(go("roam", { cspeed: 80, calmMs: 500 })).toBe("roam");
  });
  it("recently spooked → stays roam even if calm+settled", () => {
    expect(go("roam", { cspeed: 80, spooked: true })).toBe("roam");
  });
  it("a knock while curious kicks him out (spooked)", () => {
    expect(go("curious", { cspeed: 80, spooked: true })).toBe("roam");
  });
  it("lunge (fast + closing, near) → flee", () => {
    expect(go("roam", { cspeed: 1200, closing: true })).toBe("flee");
  });
  it("far cursor → roam", () => {
    expect(go("roam", { cspeed: 80, dist: 999 })).toBe("roam");
  });
  it("small nudge while curious does NOT shatter it", () => {
    expect(go("curious", { cspeed: 1000, closing: true, dist: 150 })).toBe("curious");
  });
  it("a real lunge while curious still flees", () => {
    expect(go("curious", { cspeed: 1300, closing: true, dist: 150 })).toBe("flee");
  });
  it("stays fleeing while cursor still fast", () => {
    expect(go("flee", { cspeed: 800, calmMs: 1000 })).toBe("flee");
  });
  it("leaves flee to ROAM (never straight to curious) once calmed", () => {
    expect(go("flee", { cspeed: 100, calmMs: 500 })).toBe("roam");
    expect(go("flee", { cspeed: 100, calmMs: 100 })).toBe("flee");
  });
  it("cursor gone → settle to roam", () => {
    expect(go("flee", { cActive: false })).toBe("roam");
    expect(go("curious", { cActive: false })).toBe("roam");
  });
});
