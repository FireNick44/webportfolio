import Matter from "matter-js";
import {
  CHAIN_SEGMENT_COUNT,
  CHAIN_SEGMENT_WIDTH,
  CHAIN_STIFFNESS,
  CHAIN_DAMPING,
  getSegmentHeight,
  linkCenterOffset,
  JOINT_INSET,
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
  // begins below them. With link overlap the pin sits at the first physics link's
  // TOP = its overlap-aware centre minus half its height.
  const firstPhysHeight = getSegmentHeight(staticCount);
  const staticHeight = linkCenterOffset(staticCount) - firstPhysHeight / 2;
  const pinY = anchorY + staticHeight;

  for (let idx = staticCount; idx < segmentCount; idx++) {
    // Width scales with depth (perspective/thickness); height does NOT. Centre is
    // the overlap-aware position so links sit packed/overlapping, not end-to-end.
    const h = getSegmentHeight(idx);
    segmentHeights.push(h);

    const segment = Matter.Bodies.rectangle(
      anchorX,
      anchorY + linkCenterOffset(idx),
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
  }

  // Joints connected INSET from each segment's centre (not the edge) → adjacent
  // links overlap, hiding the joint and smoothing the curve (matter-js "ropeC").
  //
  // Stiffness ramps along the chain: links nearer the anchor (static rope above)
  // are stiffer + damped more so they resist swinging, while the bottom links
  // by the flask stay loose so it can still flop around. Reads as "the chain
  // hangs steady up top, only the bottle end swings."
  const stiffTop = 0.99;
  const stiffBot = CHAIN_STIFFNESS; // 0.92, current default
  const dampTop = 0.92; // bumped from 0.7 — top physics link sits steadier so
                       // the static→physics seam on medium/low reads as one
                       // continuous rope instead of a visible joint.
  const dampBot = CHAIN_DAMPING; // 0.45
  const lastIdx = Math.max(1, segments.length - 1);
  for (let i = 0; i < segments.length - 1; i++) {
    const hA = segmentHeights[i];
    const hB = segmentHeights[i + 1];
    const frac = i / lastIdx; // 0 at top → 1 at bottom
    const stiffness = stiffTop + (stiffBot - stiffTop) * frac;
    const damping = dampTop + (dampBot - dampTop) * frac;
    const constraint = Matter.Constraint.create({
      bodyA: segments[i],
      pointA: { x: 0, y: JOINT_INSET * hA },
      bodyB: segments[i + 1],
      pointB: { x: 0, y: -JOINT_INSET * hB },
      stiffness,
      damping,
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
