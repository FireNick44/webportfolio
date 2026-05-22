import Matter from "matter-js";
import {
  FLASK_HITBOX_WIDTH,
  FLASK_HITBOX_HEIGHT,
  layerFilter,
  CAT_LAYER,
  CAT_WALL,
} from "./constants";

export interface FlaskResult {
  body: Matter.Body;
  constraint: Matter.Constraint;
}

export function createFlaskBody(
  lastChainSegment: Matter.Body,
  lastSegmentHeight: number,
  scale: number = 1,
  // Mobile cascade: flasks should overlap (stack) without pushing each other
  // apart. This filter collides with the walls only — not other flasks —
  // reusing existing categories (no new constants).
  noFlaskCollision: boolean = false,
  layer: number = 0
): FlaskResult {
  const segPos = lastChainSegment.position;
  const w = FLASK_HITBOX_WIDTH * scale;
  const hgt = FLASK_HITBOX_HEIGHT * scale;

  const body = Matter.Bodies.trapezoid(
    segPos.x,
    segPos.y + lastSegmentHeight / 2 + hgt / 2,
    w,
    hgt,
    0.3,
    {
      collisionFilter: noFlaskCollision
        ? { category: CAT_LAYER[0], mask: CAT_WALL }
        : layerFilter(layer),
      density: 0.012,
      frictionAir: 0.025,
      restitution: 0,
      sleepThreshold: 30,
      label: "flask",
    }
  );

  const constraint = Matter.Constraint.create({
    bodyA: lastChainSegment,
    pointA: { x: 0, y: lastSegmentHeight / 2 },
    bodyB: body,
    pointB: { x: 0, y: -hgt / 2 },
    stiffness: 1,
    damping: 0.7,
    length: 0,
    render: { visible: false },
  });

  return { body, constraint };
}
