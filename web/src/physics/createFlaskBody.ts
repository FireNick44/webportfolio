import Matter from "matter-js";
import {
  FLASK_HITBOX_WIDTH,
  FLASK_HITBOX_HEIGHT,
  FLASK_CHAIN_GAP,
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
  layer: number = 0,
  // Shift the chain-attachment point on the flask body (body-local px, scaled
  // by `scale`). Negative = higher up. Lets cone-style shapes have the chain
  // end visually at the cork top instead of partway down the cork.
  chainAttachOffsetPx: number = 0,
  // Matches the chain's negative `group` so flask + its own chain never collide
  // (different chains use different groups and DO collide on the same layer).
  group: number = 0,
): FlaskResult {
  const segPos = lastChainSegment.position;
  const w = FLASK_HITBOX_WIDTH * scale;
  const hgt = FLASK_HITBOX_HEIGHT * scale;
  // Drop the flask a touch below the chain so the bottommost connector tail
  // stays visible instead of being swallowed by the cork. Scaled per layer.
  const gap = FLASK_CHAIN_GAP * scale;
  // Per-shape cork-alignment shift of the chain-attach point on the flask body.
  const cork = chainAttachOffsetPx * scale;

  // INITIAL position must equal the constraint's RESTING position, or the
  // flask spawns at the wrong height and only snaps correct once physics wakes
  // it (the "looks wrong until I drag it" bug). The constraint pins
  // pointB (= body top -hgt/2 + cork) at `gap` below the chain end, so:
  //   flask_center = chain_end + gap + hgt/2 - cork
  // Previously the `- cork` term was omitted here (it lived only in the
  // constraint), so cone flasks (the only shape with cork ≠ 0) spawned ~18px
  // too high.
  const body = Matter.Bodies.trapezoid(
    segPos.x,
    segPos.y + lastSegmentHeight / 2 + hgt / 2 + gap - cork,
    w,
    hgt,
    0.3,
    {
      collisionFilter: {
        ...(noFlaskCollision
          ? { category: CAT_LAYER[0], mask: CAT_WALL }
          : layerFilter(layer)),
        group,
      },
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
    pointB: { x: 0, y: -hgt / 2 + cork },
    stiffness: 1,
    damping: 0.7,
    // Rest length = the gap, so the flask hangs `gap` px below the chain end
    // rather than snapping flush against it.
    length: gap,
    render: { visible: false },
  });

  return { body, constraint };
}
