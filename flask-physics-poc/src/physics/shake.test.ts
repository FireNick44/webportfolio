import { describe, it, expect } from "vitest";
import { shouldShake } from "./shake";

describe("shouldShake", () => {
  it("allows a shake when never shaken before", () => {
    expect(shouldShake(undefined, 1000, 450)).toBe(true);
  });
  it("blocks a shake within the cooldown window", () => {
    expect(shouldShake(1000, 1200, 450)).toBe(false);
  });
  it("allows a shake after the cooldown elapses", () => {
    expect(shouldShake(1000, 1500, 450)).toBe(true);
  });
  it("allows a shake exactly at the cooldown boundary", () => {
    expect(shouldShake(1000, 1450, 450)).toBe(true);
  });
});
