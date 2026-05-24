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
  /** Length of the static (non-physics) top portion. The physics sub-chain is
   *  pinned at anchorY + staticHeight; 0 when the whole chain is physics. */
  staticHeight: number;
}

export function createChainBodies(
  anchorX: number,
  anchorY: number,
  segmentCount: number = CHAIN_SEGMENT_COUNT,
  scale: number = 1,
  staticCount: number = 0
): ChainResult {
  const segments: Matter.Body[] = [];
  const segmentHeights: number[] = [];
  const constraints: Matter.Constraint[] = [];

  // The top `staticCount` links are drawn as a static rope (no bodies); physics
  // begins below them, pinned to the fixed point at anchorY + staticHeight.
  let staticHeight = 0;
  for (let i = 0; i < staticCount; i++) staticHeight += getSegmentHeight(i);

  const pinY = anchorY + staticHeight;
  let currentY = pinY;

  for (let idx = staticCount; idx < segmentCount; idx++) {
    // Width scales with depth (perspective/thickness); height does NOT — chain
    // LENGTH is driven by segment count per tier. Heights stay indexed by the
    // link's position in the full chain so a partial chain lines up under its
    // static top.
    const h = getSegmentHeight(idx);
    segmentHeights.push(h);

    const y = currentY + h / 2;
    const segment = Matter.Bodies.rectangle(
      anchorX,
      y,
      CHAIN_SEGMENT_WIDTH * scale,
      h,
      {
        collisionFilter: CHAIN_FILTER,
        density: 0.001,
        frictionAir: 0.03,
        sleepThreshold: 30,
        label: `chain-segment-${idx}`,
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
    pointA: { x: anchorX, y: pinY },
    bodyB: segments[0],
    pointB: { x: 0, y: -segmentHeights[0] / 2 },
    stiffness: 1,
    damping: 0.4,
    length: 0,
    render: { visible: false },
  });

  return { segments, segmentHeights, constraints, anchorConstraint, staticHeight };
}
