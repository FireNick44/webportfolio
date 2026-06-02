import Matter from "matter-js";
import { describe, it, expect } from "vitest";

import { FLASK_HITBOX_HEIGHT, FLASK_HITBOX_WIDTH } from "./constants";
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

// Proves the actual collision OUTCOME of the mobile depth-band system (not just
// that the layer value is set): two overlapping flasks separate iff they share a
// collision layer, and pass through each other across layers — the desktop-style
// "same depth collides, cross depth passes through" behaviour mobile now uses.
describe("createFlaskBody collision banding", () => {
  // Build two overlapping free flask bodies (distinct negative groups so the
  // group rule doesn't suppress collision → category/mask decides), step the
  // engine, return the horizontal gap before vs after.
  function overlapThenSettle(layerA: number, layerB: number) {
    const segA = Matter.Bodies.rectangle(0, 0, 10, 40, { isStatic: true });
    const segB = Matter.Bodies.rectangle(0, 0, 10, 40, { isStatic: true });
    const a = createFlaskBody(segA, 40, 1, false, layerA, 0, -1).body;
    const b = createFlaskBody(segB, 40, 1, false, layerB, 0, -2).body;
    // Overlap b onto a by half a hitbox width, same height.
    Matter.Body.setPosition(b, {
      x: a.position.x + FLASK_HITBOX_WIDTH * 0.5,
      y: a.position.y,
    });
    const before = Math.abs(b.position.x - a.position.x);
    const engine = Matter.Engine.create();
    engine.gravity.y = 0; // isolate collision response from gravity
    Matter.Composite.add(engine.world, [a, b]);
    for (let i = 0; i < 40; i++) Matter.Engine.update(engine, 1000 / 60);
    const after = Math.abs(b.position.x - a.position.x);
    return { before, after };
  }

  it("same collision layer → overlapping flasks push apart", () => {
    const { before, after } = overlapThenSettle(0, 0);
    expect(after).toBeGreaterThan(before + 1);
  });

  it("different collision layer → flasks pass through (no push)", () => {
    const { before, after } = overlapThenSettle(0, 2);
    expect(after).toBeCloseTo(before, 1);
  });
});
