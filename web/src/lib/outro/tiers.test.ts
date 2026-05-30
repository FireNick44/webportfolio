import { describe, it, expect } from "vitest";

import { resolveGraphicsTier, atLeast } from "./tiers";

describe("resolveGraphicsTier", () => {
  it("passes the selected tier through on a normal desktop", () => {
    const env = { reducedMotion: false, hasFinePointer: true };
    expect(resolveGraphicsTier("high", env)).toBe("high");
    expect(resolveGraphicsTier("low", env)).toBe("low");
  });

  it("forces 'off' when reduced motion is requested, regardless of pointer", () => {
    expect(resolveGraphicsTier("high", { reducedMotion: true, hasFinePointer: true })).toBe("off");
    expect(resolveGraphicsTier("high", { reducedMotion: true, hasFinePointer: false })).toBe("off");
  });

  it("caps at 'low' when there is no fine pointer (touch)", () => {
    const touch = { reducedMotion: false, hasFinePointer: false };
    expect(resolveGraphicsTier("high", touch)).toBe("low");
    expect(resolveGraphicsTier("medium", touch)).toBe("low");
    expect(resolveGraphicsTier("low", touch)).toBe("low");
    expect(resolveGraphicsTier("off", touch)).toBe("off");
  });
});

describe("atLeast", () => {
  it("compares tiers by rank", () => {
    expect(atLeast("medium", "low")).toBe(true);
    expect(atLeast("low", "medium")).toBe(false);
    expect(atLeast("off", "off")).toBe(true);
  });
});
