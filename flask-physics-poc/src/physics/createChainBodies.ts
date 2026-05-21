import Matter from "matter-js";
import {
  CHAIN_SEGMENT_COUNT,
  CHAIN_SEGMENT_WIDTH,
  CHAIN_STIFFNESS,
  CHAIN_DAMPING,
  getSegmentHeight,
  CHAIN_FILTER,
} from "./constants";

export interface ChainResult {
  segments: Matter.Body[];
  segmentHeights: number[];
  constraints: Matter.Constraint[];
  anchorConstraint: Matter.Constraint;
}

export function createChainBodies(
  anchorX: number,
  anchorY: number,
  segmentCount: number = CHAIN_SEGMENT_COUNT,
  layer: number = 0
): ChainResult {
  const segments: Matter.Body[] = [];
  const segmentHeights: number[] = [];
  const constraints: Matter.Constraint[] = [];
  let currentY = anchorY;

  for (let i = 0; i < segmentCount; i++) {
    const h = getSegmentHeight(i);
    segmentHeights.push(h);

    const y = currentY + h / 2;
    const segment = Matter.Bodies.rectangle(
      anchorX,
      y,
      CHAIN_SEGMENT_WIDTH,
      h,
      {
        collisionFilter: CHAIN_FILTER,
        density: 0.001,
        frictionAir: 0.03,
        sleepThreshold: 30,
        label: `chain-segment-${i}`,
      }
    );
    segments.push(segment);
    currentY += h;
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const hA = segmentHeights[i];
    const hB = segmentHeights[i + 1];
    const constraint = Matter.Constraint.create({
      bodyA: segments[i],
      pointA: { x: 0, y: hA / 2 },
      bodyB: segments[i + 1],
      pointB: { x: 0, y: -hB / 2 },
      stiffness: CHAIN_STIFFNESS,
      damping: CHAIN_DAMPING,
      length: 0,
      render: { visible: false },
    });
    constraints.push(constraint);
  }

  const anchorConstraint = Matter.Constraint.create({
    pointA: { x: anchorX, y: anchorY },
    bodyB: segments[0],
    pointB: { x: 0, y: -segmentHeights[0] / 2 },
    stiffness: 1,
    damping: 0.4,
    length: 0,
    render: { visible: false },
  });

  return { segments, segmentHeights, constraints, anchorConstraint };
}
