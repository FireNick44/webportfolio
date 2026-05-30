import Matter from "matter-js";
import { describe, it, expect } from "vitest";

import { FLASK_HITBOX_HEIGHT } from "./constants";
import { createFlaskBody } from "./createFlaskBody";

describe("createFlaskBody scale", () => {
  it("scales the trapezoid hitbox by scale", () => {
    const seg = Matter.Bodies.rectangle(0, 0, 10, 40);
    const full = createFlaskBody(seg, 40, 1.0);
    const half = createFlaskBody(seg, 40, 0.5);
    const hFull = full.body.bounds.max.y - full.body.bounds.min.y;
    const hHalf = half.body.bounds.max.y - half.body.bounds.min.y;
    expect(hHalf).toBeCloseTo(hFull * 0.5, 0);
    expect(FLASK_HITBOX_HEIGHT).toBeGreaterThan(0);
  });
});
