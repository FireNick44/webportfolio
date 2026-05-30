"use client";

import Matter from "matter-js";
import { useEffect, useRef, useCallback, useContext, useMemo } from "react";

import { FrameLoopContext } from "@/lib/hooks/useFrameLoop";
import {
  CHAIN_SEGMENT_COUNT,
  CHAIN_SEGMENT_WIDTH,
  FLASK_WIDTH,
  FLASK_HEIGHT,
  FLASK_HITBOX_HEIGHT,
  FLASK_CHAIN_GAP,
  MAX_PHYSICS_SEGMENTS,
  getSegmentHeight,
  linkCenterOffset,
  chainLength,
  newChainGroup,
} from "@/lib/physics/constants";
import { createChainBodies, type ChainResult } from "@/lib/physics/createChainBodies";
import { createFlaskBody, type FlaskResult } from "@/lib/physics/createFlaskBody";
import { syncFlaskFrame, type SyncDeadbandRefs } from "@/lib/physics/flaskChainSync";
import { FLASK_SHAPE_DEFS, type FlaskShape } from "@/lib/physics/flaskShapes";

import ChainLinkSVG from "./ChainLinkSVG";
import FlaskSVG from "./FlaskSVG";
import SkeletonChainSVG from "./SkeletonChainSVG";

interface Props {
  engine: Matter.Engine;
  anchorX: number;
  anchorY: number;
  instanceId: string;
  color?: string;
  segmentCount?: number;
  layer?: number;
  skillIcon?: string;
  active?: boolean;
  noFlaskCollision?: boolean;
  scale?: number;
  /** Per-chain cap on simulated links — top `segmentCount - maxPhysicsSegments`
   *  links render as a static rope. Defaults to MAX_PHYSICS_SEGMENTS (=6). */
  maxPhysicsSegments?: number;
  isSkeleton?: boolean;
  iconBob?: { delay: number; dur: number };
  /** Lift just this flask's body bright above the hint scrim (the drag demo). */
  elevated?: boolean;
  /** Bottle silhouette to render (rect/round/cone). */
  shape?: FlaskShape;
  /** Water alpha override (0..1); the palette stores 0.7 — this lets the
   *  technical panel tune it live without rebuilding the layout. */
  liquidOpacity?: number;
}

export default function FlaskChain({
  engine,
  anchorX,
  anchorY,
  instanceId,
  color,
  segmentCount = CHAIN_SEGMENT_COUNT,
  layer = 0,
  skillIcon,
  active = true,
  noFlaskCollision = false,
  scale = 1,
  isSkeleton = false,
  maxPhysicsSegments = MAX_PHYSICS_SEGMENTS,
  iconBob,
  elevated = false,
  shape = "rect",
  liquidOpacity = 0.7,
}: Props) {
  const chainRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flaskRef = useRef<HTMLDivElement | null>(null);
  const liquidRectRef = useRef<SVGRectElement | null>(null);
  const iconRef = useRef<SVGGElement | null>(null);
  const bodiesRef = useRef<{
    chain: ChainResult;
    flask: FlaskResult;
  } | null>(null);
  const anchorRef = useRef({ x: anchorX, y: anchorY });
  const loop = useContext(FrameLoopContext);

  // One unique negative group per chain instance. Matter never collides bodies
  // sharing the same negative group, so this flask + its own chain links pass
  // through each other; OTHER chains/flasks on the same layer (different group)
  // collide via the category/mask path. Memoised to a single id for the lifetime
  // of this component (no deps → stable across re-renders + resizes).
  const group = useMemo(() => newChainGroup(), []);

  // Per-frame deadband state — collapsed into a single mutable bag so the sync
  // helper can read/write it without re-allocating refs per field. Init values
  // are out-of-range so the first frame after spawn always writes.
  const deadbandRef = useRef<SyncDeadbandRefs>({
    lastChainTransforms: [],
    lastFlaskTransform: undefined,
    lastLiquidDeg: Number.POSITIVE_INFINITY,
    lastIconDeg: Number.POSITIVE_INFINITY,
    iconAngle: 0,
    iconVel: 0,
  });

  const isStatic = isSkeleton;
  // Skeleton chains: only the bottom MAX_PHYSICS_SEGMENTS links are simulated;
  // links above that form a static rope. A fully-static (skeleton) flask is all
  // static; a short physics chain (≤ cap) has no static top.
  const staticCount = isStatic
    ? segmentCount
    : Math.max(0, segmentCount - maxPhysicsSegments);

  // Static rope: lay out the top `staticCount` links (drawn once, no physics).
  // For a fully-static (skeleton) flask staticCount === segmentCount, so this
  // positions the whole chain + flask; for a physics flask it lays out just the
  // rigid top and the swinging remainder is driven by the frame loop.
  useEffect(() => {
    if (isStatic) {
      // Skeleton chain is now a single inline-positioned <svg> (see render), so
      // only the flask body needs imperative positioning here.
      const flaskEl = flaskRef.current;
      if (flaskEl) {
        const x = anchorX - FLASK_WIDTH / 2;
        // Flask attaches at the chain bottom (overlap-aware, SCALED) + half a
        // scaled hitbox + the small scaled chain→flask gap, MINUS the per-shape
        // cork-alignment offset. This MUST match createFlaskBody's constraint:
        //   flask_center = chain_end + gap + hgt/2 − chainAttachOffsetPx
        const offset = FLASK_SHAPE_DEFS[shape].chainAttachOffsetPx ?? 0;
        const flaskCenterY =
          anchorY +
          chainLength(segmentCount) * scale +
          (FLASK_HITBOX_HEIGHT * scale) / 2 +
          FLASK_CHAIN_GAP * scale -
          offset * scale;
        flaskEl.style.transform = `translate(${x}px, ${flaskCenterY - FLASK_HEIGHT / 2}px) scale(${scale})`;
      }
      return;
    }

    // Physics chain: position the static-rope TOP links once (the swinging
    // remainder below staticCount is driven by the frame loop). Position offset
    // uses the SCALED chain length so adjacent links touch instead of gapping;
    // transform-origin defaults to the box centre, the pivot scale() needs.
    for (let i = 0; i < staticCount; i++) {
      const h = getSegmentHeight(i, segmentCount);
      const el = chainRefs.current[i];
      if (el) {
        const x = anchorX - CHAIN_SEGMENT_WIDTH / 2;
        const top = anchorY + linkCenterOffset(i, segmentCount) * scale - h / 2;
        el.style.transform = `translate(${x}px, ${top}px) scale(${scale})`;
      }
    }
  }, [isStatic, anchorX, anchorY, staticCount, segmentCount, scale, shape]);

  // Physics body creation for layers 0 & 1 — runs once on mount
  useEffect(() => {
    if (isStatic) return;

    const ax = anchorRef.current.x;
    const ay = anchorRef.current.y;

    const chain = createChainBodies(
      ax,
      ay,
      segmentCount,
      scale,
      staticCount,
      layer,
      group,
    );
    // segmentHeights stores UNSCALED heights (for wrapper sizing); the physics
    // body is built at lastH * scale, so we hand the scaled value to
    // createFlaskBody, which uses it for the body-local constraint Y and the
    // flask's world-position offset below the last chain body.
    const lastH = chain.segmentHeights[chain.segmentHeights.length - 1] * scale;
    const flask = createFlaskBody(
      chain.segments[chain.segments.length - 1],
      lastH,
      scale,
      noFlaskCollision,
      layer,
      FLASK_SHAPE_DEFS[shape].chainAttachOffsetPx ?? 0,
      group,
    );

    bodiesRef.current = { chain, flask };
    // Bodies just (re)created — clear the syncDom transform deadband caches so
    // the next frame writes the new spawn positions even if they happen to fall
    // within ε of the previous cached values (stale otherwise = element renders
    // at (0,0) on remount).
    deadbandRef.current.lastChainTransforms = [];
    deadbandRef.current.lastFlaskTransform = undefined;

    // Tell the drag handler how far the flask can travel from its anchor — used
    // to clamp the drag target so a fast/far pull can't overstretch the stiff
    // length-0 rope (which would otherwise explode into flicker). Tiny slack
    // (5%) so the constraint always has a small error to chase, never exactly 0.
    const pinX = ax;
    const pinY = ay + chain.staticHeight;
    // 35% slack (was 45%). The drag still has real over-drag room — the chain
    // can't physically stretch past its real length (the stiff length-0 rope
    // holds the body back), but the constraint target leads the body, which is
    // what reads as "I'm pulling on this thing." Tightening the slack pulls the
    // body off the maxReach circle boundary where the solver oscillated and the
    // bottom link flickered; combined with the bumped drag-constraint damping
    // (useMousePhysics startDrag: 0.18 → 0.30), the wobble at limit is gone.
    const maxReach =
      Math.hypot(flask.body.position.x - pinX, flask.body.position.y - pinY) *
      1.35;
    (flask.body.plugin as Record<string, unknown>) = {
      ...(flask.body.plugin ?? {}),
      anchor: { x: pinX, y: pinY },
      maxReach,
    };

    Matter.Composite.add(engine.world, [
      ...chain.segments,
      ...chain.constraints,
      chain.anchorConstraint,
      flask.body,
      flask.constraint,
    ]);

    liquidRectRef.current = document.getElementById(
      `liquid-rect-${instanceId}`
    ) as SVGRectElement | null;
    iconRef.current = document.getElementById(
      `icon-${instanceId}`
    ) as SVGGElement | null;

    return () => {
      if (bodiesRef.current) {
        const { chain, flask } = bodiesRef.current;
        Matter.Composite.remove(engine.world, [
          ...chain.segments,
          ...chain.constraints,
          chain.anchorConstraint,
          flask.body,
          flask.constraint,
        ]);
      }
    };
    // anchorX/anchorY intentionally excluded — resize handled separately
  }, [
    engine,
    segmentCount,
    staticCount,
    layer,
    instanceId,
    isStatic,
    noFlaskCollision,
    scale,
    group,
    shape,
  ]);

  // Handle resize: translate bodies proportionally instead of recreating
  useEffect(() => {
    if (!bodiesRef.current || isStatic) return;

    const prev = anchorRef.current;
    const dx = anchorX - prev.x;
    const dy = anchorY - prev.y;
    anchorRef.current = { x: anchorX, y: anchorY };

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    const { chain, flask } = bodiesRef.current;

    // Update the world-space pin (below the static top for skeleton chains)
    const newPinY = anchorY + chain.staticHeight;
    chain.anchorConstraint.pointA = { x: anchorX, y: newPinY };
    // Keep the drag-clamp anchor (see body-creation effect) in sync on resize.
    const p = flask.body.plugin as { anchor?: { x: number; y: number } };
    if (p?.anchor) p.anchor = { x: anchorX, y: newPinY };

    // Translate all bodies and zero velocity
    for (const seg of chain.segments) {
      Matter.Body.setPosition(seg, {
        x: seg.position.x + dx,
        y: seg.position.y + dy,
      });
      Matter.Body.setVelocity(seg, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(seg, 0);
    }
    Matter.Body.setPosition(flask.body, {
      x: flask.body.position.x + dx,
      y: flask.body.position.y + dy,
    });
    Matter.Body.setVelocity(flask.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(flask.body, 0);
  }, [anchorX, anchorY, isStatic]);

  const syncDom = useCallback(() => {
    if (!bodiesRef.current) return;
    syncFlaskFrame({
      bodies: bodiesRef.current,
      chainEls: chainRefs.current,
      flaskEl: flaskRef.current,
      liquidRectEl: liquidRectRef.current,
      iconEl: iconRef.current,
      staticCount,
      scale,
      shape,
      deadband: deadbandRef.current,
    });
  }, [scale, staticCount, shape]);

  // Subscribe to the shared frame loop only for physics layers while active
  useEffect(() => {
    if (isStatic || !active || !loop) return;
    return loop.subscribe(instanceId, syncDom);
  }, [loop, syncDom, isStatic, active, instanceId]);

  const segmentHeights = Array.from({ length: segmentCount }, (_, i) =>
    getSegmentHeight(i, segmentCount)
  );

  return (
    <>
      {isStatic ? (
        // Static skeleton: the whole chain is ONE svg, positioned once. The
        // transform is a pure function of anchor + scale so it's set inline (no
        // first-frame flash at 0,0); it pivots at the chain TOP so the chain
        // scales toward the anchor, matching the physics chains'
        // anchorY + linkCenterOffset·scale layout.
        <div
          style={{
            position: "absolute",
            width: CHAIN_SEGMENT_WIDTH,
            height: chainLength(segmentCount),
            overflow: "visible",
            pointerEvents: "none",
            transform: `translate(${anchorX - CHAIN_SEGMENT_WIDTH / 2}px, ${anchorY}px) scale(${scale})`,
            transformOrigin: `${CHAIN_SEGMENT_WIDTH / 2}px 0px`,
          }}
        >
          <SkeletonChainSVG segments={segmentCount} />
        </div>
      ) : (
        // Physics chain: per-link wrappers — the bottom links are transformed
        // per frame (animated → will-change), the static-rope top once.
        segmentHeights.map((h, i) => (
          <ChainLinkSVG
            key={`chain-${instanceId}-${i}`}
            id={`${instanceId}-${i}`}
            segmentHeight={h}
            isBottommost={i === segmentCount - 1}
            animated={i >= staticCount}
            ref={(el) => {
              chainRefs.current[i] = el;
            }}
          />
        ))
      )}
      <FlaskSVG
        ref={flaskRef}
        id={instanceId}
        color={color}
        skillIcon={skillIcon}
        iconBob={iconBob}
        elevated={elevated}
        shape={shape}
        liquidOpacity={liquidOpacity}
        isSkeleton={isSkeleton}
      />
    </>
  );
}
