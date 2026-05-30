"use client";

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pointer } from "lucide-react";
import Matter from "matter-js";
import { usePhysicsEngine } from "@/hooks/usePhysicsEngine";
import { useFrameLoop, FrameLoopContext } from "@/hooks/useFrameLoop";
import { useMousePhysics } from "@/hooks/useMousePhysics";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useAppStore } from "@/store/useAppStore";
import { WaveDivider } from "@/components/ui/WaveDivider";
import PhysicsDebugOverlay from "./PhysicsDebugOverlay";
import { WALL_FILTER, MOBILE_BREAKPOINT, MAX_RACK_WIDTH } from "@/physics/constants";
import FlaskChain from "./FlaskChain";
import ChainGradients from "./ChainGradients";
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
  ".flask-icon-bob{animation:flask-icon-bob 2.4s ease-in-out infinite;will-change:transform}" +
  // Off-screen the frame loop is paused but these CSS keyframes keep churning
  // ~one compositor layer per icon — pause them too while the rack isn't visible.
  "[data-rack-active='false'] .flask-icon-bob{animation-play-state:paused}";

// Module-level so the "drag/stir" hint, once dismissed, stays dismissed for the
// session even if the scene re-mounts when scrolled in and out of view.
let hasInteractedWithRack = false;
// Session-level activation: rack mounts frozen (engine paused) and a click on
// the overlay starts physics + kicks random flasks. Persists across remounts
// in the same session (module-level) so scrolling away and back doesn't
// re-freeze the rack; resets on hard reload.
let hasActivatedRack = false;

/** Drag ↔ Push toggle pill that floats above the bottom wave. The active-state
 *  background is a single `motion.div` shared across both buttons via `layoutId`
 *  — same trick animate-ui's Highlight primitive uses — so the pill slides
 *  between the two when you switch. Both buttons stop pointer propagation so
 *  clicking either one never triggers a drag-start on the rack underneath.
 *  Hidden on touch (`hidden md:flex`). */
const MODES = [
  { id: "drag", label: "Drag" },
  { id: "collide", label: "Push" },
] as const;

/** Click-to-activate overlay covering the whole rack until the user clicks it.
 *  Until then the engine is paused (see useFrameLoop's engineActive gate) so
 *  the rack stays visually frozen at spawn; click → activate + kick random
 *  flasks (see activateRack in PhysicsScene). z-40 covers everything beneath
 *  including the toggle, since changing modes before activation is undefined. */
function ActivationOverlay({
  show,
  onActivate,
}: {
  show: boolean;
  onActivate: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={onActivate}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-label="Activate the flask rack"
          // Full-rack overlay. Waves are bumped to z-50 (above overlay z-40) so
          // their filled silhouette renders on top of the blur — wave bands look
          // clean, blur only shows in the rack interior between them.
          className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/55 backdrop-blur-[2px]"
        >
          <span className="rounded-full border border-white/30 bg-white/10 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white/90 shadow-[0_0_24px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            Click to activate
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** Floating circle that tracks the cursor while in "Push" mode — gives the user
 *  a visual handle for the matter cursor-pusher body (r=24 in useMousePhysics).
 *  The native cursor is set to `cursor-default` on the rack container when in
 *  Push mode (see the container className), so this disc acts as the visible
 *  "where my push lands" indicator. Updates its `transform` directly via DOM
 *  ref — no React re-renders per mousemove. Only renders in collide mode AND
 *  on desktop (hidden md:block); collide mode can't be entered on mobile
 *  anyway (the toggle is desktop-only), but defending it explicitly. */
function PushCursorIndicator() {
  const mode = useAppStore((s) => s.interactionMode);
  const ref = useRef<HTMLDivElement | null>(null);
  // Viewport cursor; updated by pointermove, re-read by the scroll listener so
  // a wheel-scroll without mouse movement still places the disc correctly.
  const lastClientRef = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode !== "collide") return;
    const container = document.querySelector(
      "[data-rack-active]",
    ) as HTMLDivElement | null;
    if (!container) return;
    const sync = () => {
      const el = ref.current;
      if (!el) return;
      const rect = container.getBoundingClientRect();
      const { x: cx, y: cy } = lastClientRef.current;
      // Dead-zone: top + bottom wave bands (same clamp the WaveDivider uses).
      // The matter cursor body is gated identically in useMousePhysics, so the
      // disc and the actual pushing agree.
      const waveH = Math.max(56, Math.min(130, 0.08 * window.innerWidth));
      const active =
        cx >= rect.left && cx <= rect.right &&
        cy >= rect.top + waveH && cy <= rect.bottom - waveH;
      if (active) {
        // Outer div top-left lands at the cursor's container-local position.
        // The inner motion.div's `-ml-6 -mt-6` then back-shifts by half its
        // 48px size so its centre sits on (cx, cy). Don't add another
        // translate(-50%, -50%) here — that double-shifts and the disc rides
        // ~12px up-left of the cursor.
        el.style.transform = `translate3d(${cx - rect.left}px, ${cy - rect.top}px, 0)`;
      }
      setVisible(active);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      lastClientRef.current = { x: e.clientX, y: e.clientY };
      sync();
    };
    const onScroll = () => sync();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode]);

  if (mode !== "collide") return null;
  // Outer div owns the cursor-tracking transform (set imperatively, no React
  // re-renders per move). Inner motion.div owns opacity+scale, so the framer
  // animation can't clobber the position transform (which it would on a single
  // element since motion composes scale into the same `transform` property).
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[60] hidden md:block"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.55 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="-ml-6 -mt-6 h-12 w-12 rounded-full border-2 border-white/60 bg-white/10 shadow-[0_0_14px_rgba(255,255,255,0.25)]"
      />
    </div>
  );
}

/** Per-mode mini-animation rendered inside each toggle button while the rack
 *  is NOT yet activated. Replaces the old full-rack FlaskHint scrim — each
 *  button now demonstrates its own gesture inline:
 *    drag → a small cursor swinging left-right with a rotate (the FlaskHint
 *           pointer in miniature)
 *    push → a small disc translating left-right (the cursor-pusher in
 *           miniature, matching PushCursorIndicator's look)
 *  Colour-flips to dark on the active (white) pill, white on the inactive one. */
function ModeMini({
  id,
  active,
}: {
  id: "drag" | "collide";
  active: boolean;
}) {
  if (id === "drag") {
    return (
      <span className="relative inline-flex h-3 w-5 items-center justify-center">
        <motion.span
          animate={{ x: [-3, 3, -3], rotate: [-10, 10, -10] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className={active ? "text-black" : "text-white/80"}
        >
          <Pointer size={11} />
        </motion.span>
      </span>
    );
  }
  return (
    <span className="relative inline-flex h-3 w-5 items-center justify-center">
      <motion.span
        animate={{ x: [-4, 4, -4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className={
          active
            ? "h-2 w-2 rounded-full border border-black/70 bg-black/25"
            : "h-2 w-2 rounded-full border border-white/70 bg-white/20"
        }
      />
    </span>
  );
}

function InteractionModeToggle({ activated }: { activated: boolean }) {
  const mode = useAppStore((s) => s.interactionMode);
  const setMode = useAppStore((s) => s.setInteractionMode);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div
      className="pointer-events-auto absolute left-1/2 z-[60] hidden -translate-x-1/2 select-none md:flex"
      style={{ bottom: "clamp(72px, 9vw, 150px)" }}
      onPointerDown={stop}
      onMouseDown={stop}
    >
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1 text-xs backdrop-blur">
        {MODES.map(({ id, label }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(id)}
              className="relative flex items-center gap-1.5 rounded-full px-3 py-1"
            >
              {active && (
                <motion.span
                  layoutId="rack-mode-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-white/90"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              {!activated && <ModeMini id={id} active={active} />}
              <span
                className={
                  active
                    ? "relative text-black"
                    : "relative text-white/70 transition-colors hover:text-white"
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

  const [interacted, setInteracted] = useState(hasInteractedWithRack);
  const advanced = useAppStore((s) => s.advanced);
  const liquidOpacity = useAppStore((s) => s.liquidOpacity);
  const randomizeShapes = useAppStore((s) => s.randomizeFlaskShapes);
  const interactionMode = useAppStore((s) => s.interactionMode);
  // Shared site-wide graphics setting (capped by reduced-motion / touch).
  const tier = useGraphicsTier();
  // Icon idle-bob only on the richer tiers (off on low/off for perf/motion).
  const animateIcons = tier === "medium" || tier === "high";

  // "off" tier (or reduced-motion) → fully static rack, so stop the engine loop.
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
        x: (Math.random() - 0.5) * 28, // ±14 (was ±6)
        y: (Math.random() - 0.5) * 8, // ±4 (was ±2)
      });
      Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.4); // ±0.2 rad/step
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
  }, [dims.width > 0, dims.height, layoutSeed, randomizeShapes, config]);

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
      data-rack-active={active ? "true" : "false"}
      data-rack-activated={activated ? "true" : "false"}
      // The rack is purely visual + drag-only (no keyboard nav). The full
      // skill list lives in the About section's SkillsTable, so we hide the
      // rack from screen readers to skip the noise.
      aria-hidden
      // Mobile: a tall scroll-through rack (room for the 3-per-row grid on long
      // chains). Desktop: the pinned 100vh interactive scene.
      // Cursor depends on interaction mode: `grab` in drag mode (the rack is
      // interactive everywhere — pickGrabbable's near-miss catches presses in
      // the gaps — so a static class beats the old per-mousemove Query.point
      // hit-test that cost ~30-40 ms frames); `default` in collide mode
      // (PushCursorIndicator gives the visible "where my push lands" disc, so
      // the native cursor stays a plain arrow). startDrag inline-overrides to
      // `grabbing` during an active pull.
      className={`relative h-[120vh] w-full overflow-hidden md:sticky md:top-0 md:h-screen ${
        interactionMode === "collide" ? "cursor-default" : "cursor-grab"
      }`}
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
              // Desktop: flasks collide — the field has room and the bumping is
              // the fun. Mobile: NO collision. The dense column packs ~32
              // spaced-but-overlapping skill flasks into a narrow viewport;
              // with collision on, the (now 36) physics flasks shove each other
              // and the neighbouring chains off-screen. Separation comes from the
              // placement spread + depth (sampleX/conflicts), not Matter collision.
              // noFlaskCollision drops the flask mask to walls-only, which also
              // kills flask↔chain hits (chain↔chain is already off).
              noFlaskCollision={isMobile}
              iconBob={
                animateIcons
                  ? { delay: (i * 0.41) % 2.6, dur: 2.0 + ((i * 0.29) % 1.3) }
                  : undefined
              }
            />
          ))}
      </FrameLoopContext.Provider>

      {/* Interaction-mode toggle (Drag ↔ Push) — floats just above the bottom
          wave so it's visible without competing with the rack content. Desktop
          only; mobile keeps drag-only (touch + a cursor-push body would fight
          scroll). Buttons stop pointer propagation so clicking the pill never
          triggers a pickGrabbable underneath. z-[60] lifts it above the
          activation overlay (z-40) AND the waves (z-50) so the slider is
          interactive even before the rack is activated. */}
      <InteractionModeToggle activated={activated} />

      {/* Visual indicator for the cursor-pusher body (Push mode only, desktop
          only). Self-contained — listens to pointermove directly and writes its
          own transform; no plumbing through useMousePhysics, no React renders
          per move. */}
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

      {/* The first-run "drag me" hint (FlaskHint) used to render here as a
          full-rack scrim with a cursor animation + label. Removed: it overlapped
          the activation overlay's blur and read as visual noise. Its role is now
          covered by the per-mode mini-animations inside InteractionModeToggle —
          each button shows a tiny demo of what it does, only while the rack is
          not yet activated. */}

      {/* Physics wireframe + stats overlay (advanced mode only) */}
      {advanced && dims.width > 0 && (
        <PhysicsDebugOverlay engine={engine} containerRef={containerRef} />
      )}

      {/* Click-to-activate gate. Mounted last so it stacks above everything in
          the rack until dismissed (z-40 also pins it above the toggle pill,
          since changing modes pre-activation is undefined). */}
      <ActivationOverlay show={!activated} onActivate={activateRack} />
    </div>
  );
}
