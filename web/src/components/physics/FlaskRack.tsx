"use client";

import { memo } from "react";

import { FrameLoopContext } from "@/lib/hooks/useFrameLoop";
import type { FrameLoop } from "@/lib/physics/frameLoop";
import type { FlaskConfig } from "@/lib/physics/generateFlasks";

import FlaskChain from "./FlaskChain";

import type Matter from "matter-js";

/**
 * The flask chains themselves, split out of PhysicsScene and memoised.
 *
 * PhysicsScene re-renders on every bit of scene state (`active` when the rack
 * scrolls into view, dims on resize, the mode toggle…). None of that changes
 * a chain's props, but reconciling ~76 chains — thousands of SVG nodes — cost
 * ~50ms of script in the very frame the section first appeared. `memo` with
 * the default shallow compare skips the whole subtree unless one of these
 * props actually changes. Keep every prop here referentially stable across
 * unrelated re-renders (arrays/objects memoised in the parent).
 */
function FlaskRack({
  engine,
  loop,
  flasks,
  rackOffsetX,
  rackWidth,
  maxPhysicsSegments,
  liquidOpacity,
  animateIcons,
}: {
  engine: Matter.Engine;
  loop: FrameLoop;
  flasks: FlaskConfig[];
  rackOffsetX: number;
  rackWidth: number;
  maxPhysicsSegments: number;
  liquidOpacity: number;
  animateIcons: boolean;
}) {
  return (
    <FrameLoopContext.Provider value={loop}>
      {flasks.map((cfg, i) => (
        <FlaskChain
          key={`flask-${i}`}
          engine={engine}
          anchorX={rackOffsetX + cfg.xPct * rackWidth}
          anchorY={cfg.anchorY}
          instanceId={`flask-${i}`}
          color={cfg.color}
          segmentCount={cfg.segments}
          layer={cfg.layer}
          collisionLayer={cfg.collisionLayer}
          scale={cfg.scale}
          maxPhysicsSegments={maxPhysicsSegments}
          isSkeleton={cfg.isSkeleton}
          skillIcon={cfg.skillIcon}
          shape={cfg.shape}
          liquidOpacity={liquidOpacity}
          // Both desktop AND mobile collide now — bumping is the fun. On
          // mobile, generateFlasks bands skill flasks into DEPTH_LAYERS
          // collision groups (via cfg.collisionLayer) so a dragged flask
          // only shoves its same-band neighbours and passes through the
          // rest — the dense column no longer shoves itself off-screen the
          // way blanket same-layer collision did, but it's no longer the
          // old walls-only pass-through-everything either.
          noFlaskCollision={false}
          iconBob={
            animateIcons
              ? { delay: (i * 0.41) % 2.6, dur: 2.0 + ((i * 0.29) % 1.3) }
              : undefined
          }
        />
      ))}
    </FrameLoopContext.Provider>
  );
}

export default memo(FlaskRack);
