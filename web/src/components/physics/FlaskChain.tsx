"use client";

import { useEffect, useRef, useCallback, useContext } from "react";
import Matter from "matter-js";
import ChainLinkSVG from "./ChainLinkSVG";
import FlaskSVG from "./FlaskSVG";
import { createChainBodies, type ChainResult } from "@/physics/createChainBodies";
import { createFlaskBody, type FlaskResult } from "@/physics/createFlaskBody";
import { FrameLoopContext } from "@/hooks/useFrameLoop";
import { FLASK_SHAPE_DEFS, type FlaskShape } from "@/physics/flaskShapes";
import {
  CHAIN_SEGMENT_COUNT,
  CHAIN_SEGMENT_WIDTH,
  FLASK_WIDTH,
  FLASK_HEIGHT,
  FLASK_HITBOX_HEIGHT,
  MAX_LIQUID_TILT_DEG,
  MAX_PHYSICS_SEGMENTS,
  getSegmentHeight,
  linkCenterOffset,
  chainLength,
} from "@/physics/constants";

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
  iconBob,
  elevated = false,
  shape = "rect",
  liquidOpacity = 0.7,
}: Props) {
  const chainRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flaskRef = useRef<HTMLDivElement | null>(null);
  const liquidRectRef = useRef<SVGRectElement | null>(null);
  const dryRectRef = useRef<SVGRectElement | null>(null);
  const iconWetRef = useRef<SVGGElement | null>(null);
  const iconDryRef = useRef<SVGGElement | null>(null);
  const bodiesRef = useRef<{
    chain: ChainResult;
    flask: FlaskResult;
  } | null>(null);
  const anchorRef = useRef({ x: anchorX, y: anchorY });
  const loop = useContext(FrameLoopContext);

  // Spring state for icon rotation (delayed overshoot)
  const iconAngleRef = useRef(0);
  const iconVelRef = useRef(0);

  const opacity = 1;
  const isStatic = isSkeleton;
  // Skeleton chains: only the bottom MAX_PHYSICS_SEGMENTS links are simulated;
  // links above that form a static rope. A fully-static (skeleton) flask is all
  // static; a short physics chain (≤ cap) has no static top.
  const staticCount = isStatic
    ? segmentCount
    : Math.max(0, segmentCount - MAX_PHYSICS_SEGMENTS);

  // Static rope: lay out the top `staticCount` links (drawn once, no physics).
  // For a fully-static (skeleton) flask staticCount === segmentCount, so this
  // positions the whole chain + flask; for a physics flask it lays out just the
  // rigid top and the swinging remainder is driven by the frame loop.
  useEffect(() => {
    for (let i = 0; i < staticCount; i++) {
      // Height is unscaled (full); only width thins with depth — matches the
      // dynamic path and the physics bodies.
      const h = getSegmentHeight(i);
      const el = chainRefs.current[i];
      if (el) {
        const x = anchorX - CHAIN_SEGMENT_WIDTH / 2;
        // Overlap-aware top: the link's centre (down from the anchor) minus half
        // its height, so static links overlap exactly like the physics ones.
        const top = anchorY + linkCenterOffset(i) - h / 2;
        el.style.transform = `translate(${x}px, ${top}px) scaleX(${scale})`;
        el.style.transformOrigin = `${CHAIN_SEGMENT_WIDTH / 2}px ${h / 2}px`;
        el.style.opacity = String(opacity);
      }
    }

    if (!isStatic) return; // physics flask: body + bottom links drive the rest

    const flaskEl = flaskRef.current;
    if (flaskEl) {
      const x = anchorX - FLASK_WIDTH / 2;
      // Flask attaches at the chain bottom (overlap-aware) + half a scaled hitbox.
      const flaskCenterY =
        anchorY + chainLength(segmentCount) + (FLASK_HITBOX_HEIGHT * scale) / 2;
      flaskEl.style.transform = `translate(${x}px, ${flaskCenterY - FLASK_HEIGHT / 2}px) scale(${scale})`;
      flaskEl.style.transformOrigin = `${FLASK_WIDTH / 2}px ${FLASK_HEIGHT / 2}px`;
      flaskEl.style.opacity = String(opacity);
    }
  }, [isStatic, anchorX, anchorY, staticCount, segmentCount, scale, opacity]);

  // Physics body creation for layers 0 & 1 — runs once on mount
  useEffect(() => {
    if (isStatic) return;

    const ax = anchorRef.current.x;
    const ay = anchorRef.current.y;

    const chain = createChainBodies(ax, ay, segmentCount, scale, staticCount);
    const lastH = chain.segmentHeights[chain.segmentHeights.length - 1];
    const flask = createFlaskBody(
      chain.segments[chain.segments.length - 1],
      lastH,
      scale,
      noFlaskCollision,
      layer,
      FLASK_SHAPE_DEFS[shape].chainAttachOffsetPx ?? 0,
    );

    bodiesRef.current = { chain, flask };

    // Tell the drag handler how far the flask can travel from its anchor — used
    // to clamp the drag target so a fast/far pull can't overstretch the stiff
    // length-0 rope (which would otherwise explode into flicker). Tiny slack
    // (5%) so the constraint always has a small error to chase, never exactly 0.
    const pinX = ax;
    const pinY = ay + chain.staticHeight;
    // 45% slack so the drag has REAL over-drag room — 5/15% felt dead, target
    // was clamped almost at rest length and the body trailed by a hair. The
    // chain still can't actually stretch past its real length physically (the
    // rope's stiff constraints hold the body back), but the constraint target
    // can lead the body, which is what reads as "I'm pulling on this thing."
    const maxReach =
      Math.hypot(flask.body.position.x - pinX, flask.body.position.y - pinY) *
      1.45;
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
    dryRectRef.current = document.getElementById(
      `dry-rect-${instanceId}`
    ) as SVGRectElement | null;
    iconWetRef.current = document.getElementById(
      `icon-wet-${instanceId}`
    ) as SVGGElement | null;
    iconDryRef.current = document.getElementById(
      `icon-dry-${instanceId}`
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
    const { chain, flask } = bodiesRef.current;

    // Skip DOM sync when flask body is sleeping — nothing moved
    if (flask.body.isSleeping) return;

    // Chain links: only scale X (width) so segments stay touching vertically.
    // Physics body i maps to chain-link (staticCount + i) — the static top
    // occupies the earlier refs and is positioned once, not per frame.
    for (let i = 0; i < chain.segments.length; i++) {
      const el = chainRefs.current[staticCount + i];
      if (!el) continue;
      const seg = chain.segments[i];
      const h = chain.segmentHeights[i];
      const x = seg.position.x - CHAIN_SEGMENT_WIDTH / 2;
      const y = seg.position.y - h / 2;
      const angleDeg = seg.angle * (180 / Math.PI);
      el.style.transform = `translate(${x}px, ${y}px) rotate(${angleDeg}deg) scaleX(${scale})`;
      el.style.transformOrigin = `${CHAIN_SEGMENT_WIDTH / 2}px ${h / 2}px`;
      el.style.opacity = String(opacity);
    }

    // Flask: full scale on both axes
    const flaskEl = flaskRef.current;
    if (flaskEl) {
      const fb = flask.body;
      const x = fb.position.x - FLASK_WIDTH / 2;
      const y = fb.position.y - FLASK_HEIGHT / 2;
      const angleDeg = fb.angle * (180 / Math.PI);
      flaskEl.style.transform = `translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${scale})`;
      flaskEl.style.transformOrigin = `${FLASK_WIDTH / 2}px ${FLASK_HEIGHT / 2}px`;
      flaskEl.style.opacity = String(opacity);

      // Counter-rotate the liquid so its surface stays level — but NORMALISE to
      // [-180,180] first. Matter accumulates fb.angle unbounded, so a flip/spin
      // leaves it at 360°+ and the clamp would pin the water (and the icon that
      // chases it) tilted forever, even once the flask settles back upright.
      const normDeg = (((-angleDeg + 180) % 360) + 360) % 360 - 180;
      const clampedDeg = Math.max(
        -MAX_LIQUID_TILT_DEG,
        Math.min(MAX_LIQUID_TILT_DEG, normDeg)
      );
      const pivot = FLASK_SHAPE_DEFS[shape].pivot;
      const rotateAttr = `rotate(${clampedDeg}, ${pivot.x}, ${pivot.y})`;
      liquidRectRef.current?.setAttribute("transform", rotateAttr);
      dryRectRef.current?.setAttribute("transform", rotateAttr);

      // Icon spring: chases water angle with delay + overshoot
      const dt = 1 / 60;
      const stiffness = 4.5;
      const damping = 0.55;
      const target = clampedDeg;
      const spring = (target - iconAngleRef.current) * stiffness;
      const damp = -iconVelRef.current * damping;
      iconVelRef.current += (spring + damp) * dt * 60;
      iconAngleRef.current += iconVelRef.current * dt;
      const iconRotate = `rotate(${iconAngleRef.current}, ${pivot.x}, ${pivot.y})`;
      iconWetRef.current?.setAttribute("transform", iconRotate);
      iconDryRef.current?.setAttribute("transform", iconRotate);
    }
  }, [scale, opacity, staticCount]);

  // Subscribe to the shared frame loop only for physics layers while active
  useEffect(() => {
    if (isStatic || !active || !loop) return;
    return loop.subscribe(instanceId, syncDom);
  }, [loop, syncDom, isStatic, active, instanceId]);

  const segmentHeights = Array.from({ length: segmentCount }, (_, i) =>
    getSegmentHeight(i)
  );

  return (
    <>
      {segmentHeights.map((h, i) => (
        <ChainLinkSVG
          key={`chain-${instanceId}-${i}`}
          id={`${instanceId}-${i}`}
          segmentHeight={h}
          ref={(el) => {
            chainRefs.current[i] = el;
          }}
        />
      ))}
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
