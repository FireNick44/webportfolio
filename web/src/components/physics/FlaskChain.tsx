"use client";

import { useEffect, useRef, useCallback, useContext } from "react";
import Matter from "matter-js";
import ChainLinkSVG from "./ChainLinkSVG";
import FlaskSVG from "./FlaskSVG";
import { createChainBodies, type ChainResult } from "@/physics/createChainBodies";
import { createFlaskBody, type FlaskResult } from "@/physics/createFlaskBody";
import { FrameLoopContext } from "@/hooks/useFrameLoop";
import {
  CHAIN_SEGMENT_COUNT,
  CHAIN_SEGMENT_WIDTH,
  FLASK_WIDTH,
  FLASK_HEIGHT,
  FLASK_HITBOX_HEIGHT,
  MAX_LIQUID_TILT_DEG,
  getSegmentHeight,
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

  // Static positioning for layer 2 (no physics)
  useEffect(() => {
    if (!isStatic) return;

    let currentY = anchorY;
    for (let i = 0; i < segmentCount; i++) {
      // Height is unscaled (full); only width thins with depth — matches the
      // dynamic path and the physics bodies.
      const h = getSegmentHeight(i);
      const el = chainRefs.current[i];
      if (el) {
        const x = anchorX - CHAIN_SEGMENT_WIDTH / 2;
        el.style.transform = `translate(${x}px, ${currentY}px) scaleX(${scale})`;
        el.style.transformOrigin = `${CHAIN_SEGMENT_WIDTH / 2}px ${h / 2}px`;
        el.style.opacity = String(opacity);
      }
      currentY += h;
    }

    const flaskEl = flaskRef.current;
    if (flaskEl) {
      const x = anchorX - FLASK_WIDTH / 2;
      // Match the dynamic path: visual is centered on the (scaled) flask body
      // center, which sits half a scaled hitbox below the chain bottom.
      const flaskCenterY = currentY + (FLASK_HITBOX_HEIGHT * scale) / 2;
      flaskEl.style.transform = `translate(${x}px, ${flaskCenterY - FLASK_HEIGHT / 2}px) scale(${scale})`;
      flaskEl.style.transformOrigin = `${FLASK_WIDTH / 2}px ${FLASK_HEIGHT / 2}px`;
      flaskEl.style.opacity = String(opacity);
    }
  }, [isStatic, anchorX, anchorY, segmentCount, scale, opacity]);

  // Physics body creation for layers 0 & 1 — runs once on mount
  useEffect(() => {
    if (isStatic) return;

    const ax = anchorRef.current.x;
    const ay = anchorRef.current.y;

    const chain = createChainBodies(ax, ay, segmentCount, scale);
    const lastH = chain.segmentHeights[chain.segmentHeights.length - 1];
    const flask = createFlaskBody(
      chain.segments[chain.segments.length - 1],
      lastH,
      scale,
      noFlaskCollision,
      layer
    );

    bodiesRef.current = { chain, flask };

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

    // Update the world-space anchor point
    chain.anchorConstraint.pointA = { x: anchorX, y: anchorY };

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

    // Chain links: only scale X (width) so segments stay touching vertically
    for (let i = 0; i < chain.segments.length; i++) {
      const el = chainRefs.current[i];
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

      const clampedDeg = Math.max(
        -MAX_LIQUID_TILT_DEG,
        Math.min(MAX_LIQUID_TILT_DEG, -angleDeg)
      );
      const rotateAttr = `rotate(${clampedDeg}, 69.5, 90)`;
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
      const iconRotate = `rotate(${iconAngleRef.current}, 69.5, 90)`;
      iconWetRef.current?.setAttribute("transform", iconRotate);
      iconDryRef.current?.setAttribute("transform", iconRotate);
    }
  }, [scale, opacity]);

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
      />
    </>
  );
}
