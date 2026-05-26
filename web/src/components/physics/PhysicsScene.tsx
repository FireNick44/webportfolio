"use client";

import { useRef, useState, useEffect, useMemo, type ReactNode } from "react";
import Matter from "matter-js";
import { usePhysicsEngine } from "@/hooks/usePhysicsEngine";
import { useFrameLoop, FrameLoopContext } from "@/hooks/useFrameLoop";
import { useMousePhysics } from "@/hooks/useMousePhysics";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useAppStore } from "@/store/useAppStore";
import { WaveDivider } from "@/components/ui/WaveDivider";
import PhysicsDebugOverlay from "./PhysicsDebugOverlay";
import FlaskHint from "./FlaskHint";
import { WALL_FILTER, MOBILE_BREAKPOINT, MAX_RACK_WIDTH } from "@/physics/constants";
import FlaskChain from "./FlaskChain";
import { generateFlasks } from "@/physics/generateFlasks";
import { fieldConfigFor } from "@/physics/fieldConfig";
import skills from "@/data/skills.json";

// The wavy "surface" the flasks hang from. Black/white (the page background) so
// the monochrome frame stays consistent — colour lives only in the flask liquids.
const RACK_SURFACE_COLOR = "var(--background)";

// Idle "bob" for the skill icons (config-gated; on at medium/high). Pure CSS so
// it's GPU-composited and costs nothing per frame in JS. Per-flask phase delay
// AND period (set inline) keep them from ever bobbing in lockstep. The shared
// duration here is just a fallback; FlaskSVG overrides it per flask.
const ICON_BOB_CSS =
  "@keyframes flask-icon-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}" +
  ".flask-icon-bob{animation:flask-icon-bob 2.4s ease-in-out infinite;will-change:transform}";

// Module-level so the "drag/stir" hint, once dismissed, stays dismissed for the
// session even if the scene re-mounts when scrolled in and out of view.
let hasInteractedWithRack = false;

function createBoundaryWalls(width: number, height: number) {
  const t = 100;
  const walls: Matter.Body[] = [];

  // Top wall only — no side walls so flasks can drift off-screen
  walls.push(
    Matter.Bodies.rectangle(width / 2, -t / 2, width * 3, t, {
      isStatic: true,
      collisionFilter: WALL_FILTER,
      label: "wall-top",
    })
  );

  // Curved bottom: dome shape (center high, edges low) so flasks slide to sides
  const numSeg = 7;
  const totalW = width * 1.4;
  const segW = totalW / numSeg;
  const curveHeight = 120;
  const baseY = height + 30;

  for (let i = 0; i < numSeg; i++) {
    const frac = (i + 0.5) / numSeg;
    const nx = (frac - 0.5) * 2; // -1..1
    const xPos = -width * 0.2 + frac * totalW;
    const yPos = baseY + curveHeight * nx * nx;
    const slope = (4 * curveHeight * nx) / totalW;
    const angle = Math.atan(slope);

    walls.push(
      Matter.Bodies.rectangle(xPos, yPos, segW + 10, t, {
        isStatic: true,
        angle,
        collisionFilter: WALL_FILTER,
        label: "wall-bottom",
      })
    );
  }

  return walls;
}

export default function PhysicsScene({
  backdrop,
  hint,
}: {
  backdrop?: ReactNode;
  hint?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engine = usePhysicsEngine();
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const wallsRef = useRef<Matter.Body[]>([]);
  const [active, setActive] = useState(false);
  // New random flask layout on each page load (stable within the session — the
  // memo below keeps it across resizes; only a refresh/remount reshuffles).
  const [layoutSeed] = useState(() => (Math.random() * 0x7fffffff) | 0);
  const [interacted, setInteracted] = useState(hasInteractedWithRack);
  const advanced = useAppStore((s) => s.advanced);
  const liquidOpacity = useAppStore((s) => s.liquidOpacity);
  const randomizeShapes = useAppStore((s) => s.randomizeFlaskShapes);
  // Shared site-wide graphics setting (capped by reduced-motion / touch).
  const tier = useGraphicsTier();
  // Icon idle-bob only on the richer tiers (off on low/off for perf/motion).
  const animateIcons = tier === "medium" || tier === "high";

  // "off" tier (or reduced-motion) → fully static rack, so stop the engine loop.
  const loop = useFrameLoop(engine, active && tier !== "off");
  useMousePhysics(engine, containerRef);

  const isMobile = dims.width > 0 && dims.width < MOBILE_BREAKPOINT;
  // Cap the placement width on ultra-wide screens and centre the band, so the
  // flasks don't spread edge-to-edge forever. Mobile/normal widths are unaffected.
  const rackWidth = Math.min(dims.width, MAX_RACK_WIDTH);
  const rackOffsetX = (dims.width - rackWidth) / 2;
  const flasks = useMemo(() => {
    if (dims.width === 0) return [];
    const config = fieldConfigFor(tier, isMobile);
    const skillPaths = skills.map((s) => s.svgPath);
    // svgPath → dominant icon colour, so flask water is picked to contrast.
    const colorByPath = Object.fromEntries(
      skills.map((s) => [s.svgPath, s.color])
    );
    // Mirror the WaveDivider's CSS height clamp(56px, 8vw, 130px) so flasks keep
    // clear of the top + bottom wave bands.
    const waveHeight = Math.max(56, Math.min(130, 0.08 * dims.width));
    return generateFlasks(
      config,
      { width: Math.min(dims.width, MAX_RACK_WIDTH), height: dims.height },
      skillPaths,
      layoutSeed,
      colorByPath,
      waveHeight,
      randomizeShapes
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.width > 0, isMobile, dims.height, tier, layoutSeed, randomizeShapes]);

  // (Demo "drag me" spotlight removed — was not smooth; the hint scrim is
  // enough on its own.)

  useEffect(() => {
    if (dims.width === 0) return;
    if (wallsRef.current.length) {
      Matter.Composite.remove(engine.world, wallsRef.current);
    }
    const walls = createBoundaryWalls(dims.width, dims.height);
    wallsRef.current = walls;
    Matter.Composite.add(engine.world, walls);
    return () => {
      Matter.Composite.remove(engine.world, walls);
    };
  }, [engine, dims.width, dims.height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDims({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Virtualization: only run the simulation while the rack is on-screen.
  // Off-screen → engine + DOM sync pause entirely (near-zero CPU).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setActive(entries[0].isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Dismiss the interaction hint on the first PRESS (click / tap) — the hint now
  // prompts a click (which sets flasks swinging), so a mere hover or a scroll
  // (which fires mousemove as content slides under the cursor) must NOT dismiss
  // it, or the prompt would vanish before the visitor ever clicks.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onFirst = () => {
      hasInteractedWithRack = true;
      setInteracted(true);
    };
    const opts = { once: true } as const;
    el.addEventListener("pointerdown", onFirst, opts);
    el.addEventListener("mousedown", onFirst, opts);
    el.addEventListener("touchstart", onFirst, opts);
    return () => {
      el.removeEventListener("pointerdown", onFirst);
      el.removeEventListener("mousedown", onFirst);
      el.removeEventListener("touchstart", onFirst);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      // Mobile: a tall scroll-through rack (room for the 3-per-row grid on long
      // chains). Desktop: the pinned 100vh interactive scene.
      className="relative h-[120vh] w-full overflow-hidden md:sticky md:top-0 md:h-screen"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "pan-y",
      }}
    >
      {backdrop}
      {animateIcons && (
        <style dangerouslySetInnerHTML={{ __html: ICON_BOB_CSS }} />
      )}
      <FrameLoopContext.Provider value={loop}>
        {dims.width > 0 &&
          flasks.map((cfg, i) => (
            <FlaskChain
              key={`flask-${i}`}
              engine={engine}
              anchorX={rackOffsetX + cfg.xPct * rackWidth}
              anchorY={cfg.anchorY}
              instanceId={`flask-${i}`}
              color={cfg.color}
              segmentCount={cfg.segments}
              layer={cfg.layer}
              scale={cfg.scale}
              isSkeleton={cfg.isSkeleton}
              skillIcon={cfg.skillIcon}
              shape={cfg.shape}
              liquidOpacity={liquidOpacity}
              active={active}
              // Collide on mobile too: only the ≤8 dynamic flasks have bodies
              // (statics are DOM-only, FlaskChain skips them), all in tier 0, so
              // they bump each other without a static "thicket" to fight.
              noFlaskCollision={false}
              iconBob={
                animateIcons
                  ? { delay: (i * 0.41) % 2.6, dur: 2.0 + ((i * 0.29) % 1.3) }
                  : undefined
              }
            />
          ))}
      </FrameLoopContext.Provider>

      {/* Waves: rendered AFTER the flasks so the bottles tuck behind them top
          and bottom. pointer-events-none so they never block the rack
          interaction. Hidden in advanced mode. */}
      {!advanced && (
        <>
          <WaveDivider
            fill={RACK_SURFACE_COLOR}
            flip
            className="pointer-events-none absolute inset-x-0 top-0 z-20"
          />
          <WaveDivider
            fill={RACK_SURFACE_COLOR}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
          />
        </>
      )}

      {/* First-run "drag me" hint (hidden in advanced mode) */}
      {hint && !advanced && (
        <FlaskHint show={active && !interacted} label={hint} />
      )}

      {/* Physics wireframe + stats overlay (advanced mode only) */}
      {advanced && dims.width > 0 && (
        <PhysicsDebugOverlay engine={engine} containerRef={containerRef} />
      )}
    </div>
  );
}
