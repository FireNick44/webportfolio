import Matter from "matter-js";

import {
  CHAIN_SEGMENT_COUNT,
  CHAIN_SEGMENT_WIDTH,
  CHAIN_STIFFNESS,
  CHAIN_DAMPING,
  getSegmentHeight,
  linkCenterOffset,
  JOINT_INSET,
  chainCollisionFilter,
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
  staticCount: number = 0,
  // Collision layer + per-chain group: chains adopt the flask's layer category
  // so cross-chain (different flask) same-layer hits land, and the negative
  // group keeps the chain from colliding with its own segments + flask.
  // Defaults reproduce the legacy "chain hits nothing but its constraints"
  // behaviour when callers don't pass them (the layer-0 mask is harmless on
  // an isolated chain, and group=0 is Matter's "no group" sentinel).
  layer: number = 0,
  group: number = 0,
): ChainResult {
  const segments: Matter.Body[] = [];
  const segmentHeights: number[] = [];
  const constraints: Matter.Constraint[] = [];

  // Scale applies UNIFORMLY to chain dimensions now (was previously X-only).
  // Width AND height of the bodies, the spacing offsets, the static-rope length
  // and the constraint anchor points — all multiplied by `scale` so back-layer
  // chains have proportionally-sized cap rings instead of width-only-scaled
  // tall-thin stretched pills. The unscaled segmentHeights are kept in
  // `segmentHeights[]` because the render side (FlaskChain.tsx) uses them to
  // size the wrapper's CSS box in unscaled coords AND applies the same
  // `scale(scale)` transform — wrapper-box maths and body-size maths therefore
  // both work out, with the visual content (scaled inside the wrapper) lining
  // up with the (scaled) body extent.

  // The top `staticCount` links are drawn as a static rope (no bodies); physics
  // begins below them. With link overlap the pin sits at the first physics link's
  // TOP = its overlap-aware centre minus half its height.
  const firstPhysHeight = getSegmentHeight(staticCount, segmentCount);
  const staticHeight =
    (linkCenterOffset(staticCount, segmentCount) - firstPhysHeight / 2) * scale;
  const pinY = anchorY + staticHeight;

  for (let idx = staticCount; idx < segmentCount; idx++) {
    const h = getSegmentHeight(idx, segmentCount);
    segmentHeights.push(h); // UNSCALED — render uses these for wrapper CSS box

    const segment = Matter.Bodies.rectangle(
      anchorX,
      anchorY + linkCenterOffset(idx, segmentCount) * scale,
      CHAIN_SEGMENT_WIDTH * scale,
      h * scale,
      {
        collisionFilter: chainCollisionFilter(layer, group),
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
      // pointA/pointB are BODY-LOCAL coords; body height is hA * scale, so the
      // joint inset is JOINT_INSET * hA * scale (otherwise the pin sits outside
      // the body for scale < 1 and the constraint goes unstable).
      pointA: { x: 0, y: JOINT_INSET * hA * scale },
      bodyB: segments[i + 1],
      pointB: { x: 0, y: -JOINT_INSET * hB * scale },
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
    // Body-local half-height (top edge of the body): scaled.
    pointB: { x: 0, y: (-segmentHeights[0] / 2) * scale },
    stiffness: 1,
    damping: 0.4,
    length: 0,
    render: { visible: false },
  });

  return { segments, segmentHeights, constraints, anchorConstraint, staticHeight };
}
