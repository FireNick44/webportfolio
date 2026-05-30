import { describe, it, expect } from "vitest";

import { repel, advanceRipple, lerp } from "./cursorPhysics";

describe("repel", () => {
  it("returns zero push outside the radius", () => {
    expect(repel(0, 0, 100, 0, 50, 10)).toEqual({ dx: 0, dy: 0 });
  });
  it("pushes the point away from the cursor when inside the radius", () => {
    const { dx, dy } = repel(10, 0, 0, 0, 50, 10);
    expect(dx).toBeGreaterThan(0);
    expect(Math.abs(dy)).toBeLessThan(1e-9);
  });
  it("pushes harder the closer the point is", () => {
    const near = repel(5, 0, 0, 0, 50, 10).dx;
    const far = repel(40, 0, 0, 0, 50, 10).dx;
    expect(near).toBeGreaterThan(far);
  });
});

describe("advanceRipple", () => {
  it("grows the radius and fades the alpha over time", () => {
    const next = advanceRipple({ x: 1, y: 2, r: 4, alpha: 0.5 }, 0.1, 60, 0.6);
    expect(next.r).toBeCloseTo(10);
    expect(next.alpha).toBeCloseTo(0.44);
    expect(next.x).toBe(1);
    expect(next.y).toBe(2);
  });
});

describe("lerp", () => {
  it("interpolates between a and b", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});
