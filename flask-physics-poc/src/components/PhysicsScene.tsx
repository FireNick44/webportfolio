import { useRef, useState, useEffect, useMemo } from "react";
import Matter from "matter-js";
import { usePhysicsEngine } from "../hooks/usePhysicsEngine";
import {
  useFlaskFieldLoop,
  FlaskFieldLoopContext,
} from "../hooks/useFlaskFieldLoop";
import { useMousePhysics } from "../hooks/useMousePhysics";
import {
  WALL_FILTER,
  MOBILE_BREAKPOINT,
  COLUMN_COUNT,
  SKELETON_BANDS,
  FLASK_SPACING_X,
  MIN_FLASKS,
  MAX_FLASKS,
  MAX_PHYSICS_FLASKS,
  FLASK_FRICTION,
  ENGINE_WAKE_MS,
} from "../physics/constants";
import {
  generateFlaskField,
  computeTargetCount,
} from "../layout/generateFlaskField";
import { getSessionSeed } from "../layout/rng";
import type { LayoutConfig } from "../types/flask";
import FlaskChain from "./FlaskChain";
import DebugPanel from "./DebugPanel";
import skills from "../data/skills.json";

function createBoundaryWalls(width: number, height: number) {
  const t = 100;
  const walls: Matter.Body[] = [];

  // Top wall only — no side walls so flasks can drift off-screen
  walls.push(
    Matter.Bodies.rectangle(width / 2, -t / 2, width * 3, t, {
      isStatic: true,
      collisionFilter: WALL_FILTER,
      friction: FLASK_FRICTION,
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
        friction: FLASK_FRICTION,
        label: "wall-bottom",
      })
    );
  }

  return walls;
}

export default function PhysicsScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engine = usePhysicsEngine();
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const wallsRef = useRef<Matter.Body[]>([]);

  const loop = useFlaskFieldLoop(engine, ENGINE_WAKE_MS);
  useMousePhysics(engine, containerRef);

  // Per-session seed: stable while the tab is open, fresh next visit.
  const seed = useMemo(() => getSessionSeed(), []);
  const layoutConfig: LayoutConfig = useMemo(
    () => ({
      columnCount: COLUMN_COUNT,
      skeletonBands: SKELETON_BANDS,
      flaskSpacingX: FLASK_SPACING_X,
      minFlasks: MIN_FLASKS,
      maxFlasks: MAX_FLASKS,
      maxPhysicsFlasks: MAX_PHYSICS_FLASKS,
    }),
    []
  );

  const isMobile = dims.width > 0 && dims.width < MOBILE_BREAKPOINT;

  // Recompute only when the derived count (or mobile/seed) changes — not every
  // resize pixel. Positions are stored as xPct, so between count-steps a resize
  // still repositions smoothly via anchorX = xPct * width.
  const targetCount =
    dims.width > 0 ? computeTargetCount(dims.width, layoutConfig) : 0;

  const flasks = useMemo(
    () =>
      dims.width > 0
        ? generateFlaskField({
            width: dims.width,
            height: dims.height,
            isMobile,
            skills,
            seed,
            config: layoutConfig,
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetCount, isMobile, seed]
  );

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
    // Seed dimensions synchronously on mount. ResizeObserver's initial delivery
    // is deferred while a tab is hidden/backgrounded, so relying on it alone can
    // leave the field unrendered; getBoundingClientRect works regardless.
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDims({ width: rect.width, height: rect.height });
    }
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDims({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // On scroll, nudge a random subset of flask bodies (up to 10).
  // RAF-throttled to avoid firing hundreds of times per second.
  const scrollFlasksRef = useRef<Matter.Body[]>([]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollDelta = 0;
    let scrollRAF = 0;

    const pickScrollFlasks = () => {
      const all = Matter.Composite.allBodies(engine.world).filter(
        (b) => !b.isStatic && b.label === "flask"
      );
      // Shuffle and pick up to 10
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      scrollFlasksRef.current = all.slice(0, 10);
    };

    const applyScrollForce = () => {
      scrollRAF = 0;
      if (Math.abs(scrollDelta) < 1) {
        scrollDelta = 0;
        return;
      }

      // Re-pick targets occasionally so different flasks react over time
      if (scrollFlasksRef.current.length === 0) {
        pickScrollFlasks();
      }

      const force = scrollDelta * 0.00015;
      for (const body of scrollFlasksRef.current) {
        Matter.Sleeping.set(body, false);
        Matter.Body.applyForce(body, body.position, {
          x: force * body.mass,
          y: 0,
        });
      }
      scrollDelta = 0;
      loop.wake(); // resume the (possibly suspended) loop to integrate the nudge
    };

    const onScroll = () => {
      const scrollY = window.scrollY;
      scrollDelta += scrollY - lastScrollY;
      lastScrollY = scrollY;

      if (!scrollRAF) {
        // Pick new random flasks each scroll burst
        pickScrollFlasks();
        scrollRAF = requestAnimationFrame(applyScrollForce);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRAF) cancelAnimationFrame(scrollRAF);
    };
  }, [engine, loop]);

  return (
    <FlaskFieldLoopContext.Provider value={loop}>
      <div
        ref={containerRef}
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {dims.width > 0 &&
          flasks.map((cfg, i) => (
            <FlaskChain
              key={`flask-${i}`}
              engine={engine}
              anchorX={cfg.xPct * dims.width}
              anchorY={cfg.anchorY}
              instanceId={`flask-${i}`}
              color={cfg.color}
              segmentCount={cfg.segments}
              layer={cfg.layer}
              skillIcon={cfg.skillIcon}
              isSkeleton={cfg.isSkeleton}
            />
          ))}
        <DebugPanel engine={engine} containerRef={containerRef} />
      </div>
    </FlaskFieldLoopContext.Provider>
  );
}
