"use client";

import Matter from "matter-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { WaveDivider } from "@/components/ui/WaveDivider";
import skills from "@/data/skills.json";
import { FrameLoopContext, useFrameLoop } from "@/lib/hooks/useFrameLoop";
import { useGraphicsTier } from "@/lib/hooks/useGraphicsTier";
import { useMousePhysics } from "@/lib/hooks/useMousePhysics";
import { usePhysicsEngine } from "@/lib/hooks/usePhysicsEngine";
import {
  MAX_RACK_WIDTH,
  MOBILE_BREAKPOINT,
} from "@/lib/physics/constants";
import { createBoundaryWalls } from "@/lib/physics/createBoundaryWalls";
import { fieldConfigFor } from "@/lib/physics/fieldConfig";
import { generateFlasks } from "@/lib/physics/generateFlasks";
import { useAppStore } from "@/lib/store/useAppStore";

import ActivationOverlay from "./ActivationOverlay";
import ChainGradients from "./ChainGradients";
import FlaskChain from "./FlaskChain";
import InteractionModeToggle from "./InteractionModeToggle";
import PhysicsDebugOverlay from "./PhysicsDebugOverlay";
import PushCursorIndicator from "./PushCursorIndicator";

// The wavy "surface" the flasks hang from. Black/white (the page background) so
// the monochrome frame stays consistent — colour lives only in the flask liquids.
const RACK_SURFACE_COLOR = "var(--background)";

// Idle "bob" for the skill icons (config-gated; on at medium/high). Pure CSS so
// it's GPU-composited and costs nothing per frame in JS. Per-flask phase delay
// AND period (set inline) keep them from ever bobbing in lockstep. The shared
// duration here is just a fallback; FlaskSVG overrides it per flask.
const ICON_BOB_CSS =
  "@keyframes flask-icon-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}" +
  ".flask-icon-bob{animation:flask-icon-bob 2.4s ease-in-out infinite;will-change:transform}" +
  // Off-screen the frame loop is paused but these CSS keyframes keep churning
  // ~one compositor layer per icon — pause them too while the rack isn't visible.
  "[data-rack-active='false'] .flask-icon-bob{animation-play-state:paused}";

// Session-level activation: rack mounts frozen (engine paused) and a click on
// the overlay starts physics + kicks random flasks. Persists across remounts
// in the same session (module-level) so scrolling away and back doesn't
// re-freeze the rack; resets on hard reload.
let hasActivatedRack = false;

export default function PhysicsScene({ backdrop }: { backdrop?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engine = usePhysicsEngine();
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const wallsRef = useRef<Matter.Body[]>([]);
  const [active, setActive] = useState(false);
  // New random flask layout on each page load (stable within the session — the
  // memo below keeps it across resizes). The "shuffle" notification / #shuffle
  // hash bumps `flaskShuffleCounter` in the store and we regenerate the seed,
  // so the rack reshuffles live without a full page reload.
  const [layoutSeed, setLayoutSeed] = useState(
    () => (Math.random() * 0x7fffffff) | 0,
  );
  const flaskShuffleCounter = useAppStore((s) => s.flaskShuffleCounter);
  useEffect(() => {
    if (flaskShuffleCounter > 0) {
      setLayoutSeed((Math.random() * 0x7fffffff) | 0);
    }
  }, [flaskShuffleCounter]);

  const advanced = useAppStore((s) => s.advanced);
  const liquidOpacity = useAppStore((s) => s.liquidOpacity);
  const randomizeShapes = useAppStore((s) => s.randomizeFlaskShapes);
  const interactionMode = useAppStore((s) => s.interactionMode);
  // Shared site-wide graphics setting (capped by reduced-motion / touch).
  const tier = useGraphicsTier();
  // Icon idle-bob only on the richer tiers (off on low/off for perf/motion).
  const animateIcons = tier === "medium" || tier === "high";

  const [activated, setActivated] = useState(() => hasActivatedRack);
  // engine gate: rAF still ticks (so flask wrappers get their spawn-position
  // transforms written via syncDom + deadband), but Matter.Engine.update is
  // skipped until the user clicks the activation overlay.
  const loop = useFrameLoop(engine, active && tier !== "off", activated);
  const activateRack = useCallback(() => {
    hasActivatedRack = true;
    setActivated(true);
    // Kick a chunk of random foreground flasks HARD so the rack pops alive on
    // click instead of just twitching. Wake first (sleeping bodies ignore
    // setVelocity). Velocity magnitudes sit well under MAX_BODY_SPEED (45) and
    // MAX_ANGULAR_SPEED (0.5 rad/step) so the engine's afterUpdate caps
    // (usePhysicsEngine) never need to step in. A small spin nudge on top of
    // the linear kick gives the bottles a more chaotic, organic "shake awake".
    const all = Matter.Composite.allBodies(engine.world);
    const flasks = all.filter((b) => b.label === "flask" && !b.isStatic);
    // 6–12 flasks (was 1–5). With 27 physics flasks at high tier, that's
    // roughly a third of the rack getting jolted at once.
    const n = Math.max(6, Math.min(12, Math.floor(Math.random() * 7) + 6));
    // Fisher-Yates partial: pick `n` distinct flasks without sorting the whole list.
    for (let i = flasks.length - 1; i > flasks.length - 1 - n && i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flasks[i], flasks[j]] = [flasks[j], flasks[i]];
    }
    for (const b of flasks.slice(-n)) {
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, {
        x: (Math.random() - 0.5) * 28,
        y: (Math.random() - 0.5) * 8,
      });
      Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.4);
    }
  }, [engine]);
  useMousePhysics(engine, containerRef);

  const isMobile = dims.width > 0 && dims.width < MOBILE_BREAKPOINT;
  // Cap the placement width on ultra-wide screens and centre the band, so the
  // flasks don't spread edge-to-edge forever. Mobile/normal widths are unaffected.
  const rackWidth = Math.min(dims.width, MAX_RACK_WIDTH);
  const rackOffsetX = (dims.width - rackWidth) / 2;
  const config = useMemo(
    () => fieldConfigFor(tier, isMobile),
    [tier, isMobile],
  );
  const flasks = useMemo(() => {
    if (dims.width === 0) return [];
    const skillPaths = skills.map((s) => s.svgPath);
    // svgPath → dominant icon colour, so flask water is picked to contrast.
    const colorByPath = Object.fromEntries(
      skills.map((s) => [s.svgPath, s.color]),
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
      randomizeShapes,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.width > 0, dims.height, layoutSeed, randomizeShapes, config]);

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
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      data-rack-active={active ? "true" : "false"}
      data-rack-activated={activated ? "true" : "false"}
      // The rack is purely visual + drag-only (no keyboard nav). The full
      // skill list lives in the About section's SkillsTable, so we hide the
      // rack from screen readers to skip the noise.
      aria-hidden
      // Cursor depends on interaction mode: `grab` in drag mode (the rack is
      // interactive everywhere — pickGrabbable's near-miss catches presses in
      // the gaps); `default` in collide mode (PushCursorIndicator gives the
      // visible "where my push lands" disc, so the native cursor stays a plain
      // arrow). startDrag inline-overrides to `grabbing` during an active pull.
      className={`relative h-[120vh] w-full overflow-hidden md:sticky md:top-0 md:h-screen ${
        interactionMode === "collide" ? "cursor-default" : "cursor-grab"
      }`}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "pan-y",
        // Pre-warm the compositor layer. Brave/Chromium otherwise allocates a
        // new layer the first time the sticky child engages on scroll-in, and
        // the area flashes the page bg colour (warm bone) for a frame before
        // the rack content paints in. translateZ(0) promotes the layer at
        // mount so the first scroll is just a position change, not a layer
        // create + raster.
        transform: "translateZ(0)",
      }}
    >
      {backdrop}
      {animateIcons && (
        <style dangerouslySetInnerHTML={{ __html: ICON_BOB_CSS }} />
      )}
      {/* Shared gradient defs every ChainLinkSVG points at — one source instead
          of ~3000 per-link clones at peak density (see ChainGradients.tsx). */}
      <ChainGradients />
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
              maxPhysicsSegments={config.maxPhysicsSegments}
              isSkeleton={cfg.isSkeleton}
              skillIcon={cfg.skillIcon}
              shape={cfg.shape}
              liquidOpacity={liquidOpacity}
              active={active}
              // Desktop: flasks collide — bumping is the fun. Mobile: NO
              // collision. The dense column shoves itself off-screen with
              // collision on; separation comes from the placement spread +
              // depth (sampleX/conflicts), not Matter collision.
              // noFlaskCollision drops the flask mask to walls-only, which
              // also kills flask↔chain hits (chain↔chain is already off).
              noFlaskCollision={isMobile}
              iconBob={
                animateIcons
                  ? { delay: (i * 0.41) % 2.6, dur: 2.0 + ((i * 0.29) % 1.3) }
                  : undefined
              }
            />
          ))}
      </FrameLoopContext.Provider>

      <InteractionModeToggle activated={activated} />
      <PushCursorIndicator />

      {/* Waves: rendered AFTER the flasks so the bottles tuck behind them top
          and bottom. pointer-events-none so they never block the rack
          interaction. Hidden in advanced mode. */}
      {!advanced && (
        <>
          <WaveDivider
            fill={RACK_SURFACE_COLOR}
            flip
            className="pointer-events-none absolute inset-x-0 top-0 z-50"
          />
          <WaveDivider
            fill={RACK_SURFACE_COLOR}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-50"
          />
        </>
      )}

      {advanced && dims.width > 0 && (
        <PhysicsDebugOverlay engine={engine} containerRef={containerRef} />
      )}

      {/* Click-to-activate gate. Mounted last so it stacks above everything in
          the rack until dismissed. */}
      <ActivationOverlay show={!activated} onActivate={activateRack} />
    </div>
  );
}
