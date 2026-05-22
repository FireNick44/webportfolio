import Matter from "matter-js";
import {
  FLASK_HITBOX_WIDTH,
  FLASK_HITBOX_HEIGHT,
  FLASK_FRICTION,
  layerFilter,
} from "./constants";

export interface FlaskResult {
  body: Matter.Body;
  constraint: Matter.Constraint;
}

export function createFlaskBody(
  lastChainSegment: Matter.Body,
  lastSegmentHeight: number,
  layer: number = 0
): FlaskResult {
  const segPos = lastChainSegment.position;

  const body = Matter.Bodies.trapezoid(
    segPos.x,
    segPos.y + lastSegmentHeight / 2 + FLASK_HITBOX_HEIGHT / 2,
    FLASK_HITBOX_WIDTH,
    FLASK_HITBOX_HEIGHT,
    0.3,
    {
      collisionFilter: layerFilter(layer),
      density: 0.012,
      friction: FLASK_FRICTION,
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
    pointB: { x: 0, y: -FLASK_HITBOX_HEIGHT / 2 },
    stiffness: 1,
    damping: 0.7,
    length: 0,
    render: { visible: false },
  });

  return { body, constraint };
}
