import { describe, it, expect } from "vitest";
import { isTap, classifyTap, annoyForTap, ANNOY_INK } from "./ink";

describe("isTap (tap vs scroll)", () => {
  it("brief + still = tap", () => expect(isTap(200, 5)).toBe(true));
  it("too long = not a tap (scroll hold)", () => expect(isTap(300, 5)).toBe(false));
  it("moved too far = not a tap (scroll drag)", () => expect(isTap(200, 20)).toBe(false));
  it("boundaries inclusive", () => expect(isTap(250, 10)).toBe(true));
});

describe("classifyTap", () => {
  it("on him within hit radius", () => {
    expect(classifyTap(50)).toBe("on");
    expect(classifyTap(70)).toBe("on");
  });
  it("around him within scare radius", () => {
    expect(classifyTap(120)).toBe("around");
    expect(classifyTap(180)).toBe("around");
  });
  it("miss beyond scare radius", () => expect(classifyTap(300)).toBe("miss"));
});

describe("annoyForTap", () => {
  it("two on-taps reach the ink threshold", () =>
    expect(annoyForTap("on") * 2).toBeGreaterThanOrEqual(ANNOY_INK));
  it("around < on, miss = 0", () => {
    expect(annoyForTap("around")).toBeLessThan(annoyForTap("on"));
    expect(annoyForTap("miss")).toBe(0);
  });
});
