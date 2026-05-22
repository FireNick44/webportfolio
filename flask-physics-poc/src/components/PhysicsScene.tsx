import { useRef, useState, useEffect, useMemo } from "react";
import Matter from "matter-js";
import { usePhysicsEngine } from "../hooks/usePhysicsEngine";
import { useAnimationSync } from "../hooks/useAnimationSync";
import { useMousePhysics } from "../hooks/useMousePhysics";
import {
  DEPTH_LAYERS,
  MIN_SAME_LAYER_DISTANCE_PCT,
  WALL_FILTER,
  MOBILE_BREAKPOINT,
} from "../physics/constants";
import FlaskChain from "./FlaskChain";
import DebugPanel from "./DebugPanel";
import skills from "../data/skills.json";

const FLASK_COUNT = 40;
const MOBILE_FLASK_COUNT = 18;
const MIN_SEGMENTS = 3;
const MAX_SEGMENTS = 14;

const FLASK_COLORS = [
  "rgba(255, 86, 86, 0.7)",
  "rgba(86, 200, 255, 0.7)",
  "rgba(86, 255, 130, 0.7)",
  "rgba(255, 200, 60, 0.7)",
  "rgba(200, 86, 255, 0.7)",
  "rgba(255, 140, 60, 0.7)",
  "rgba(60, 255, 220, 0.7)",
  "rgba(255, 100, 180, 0.7)",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FlaskConfig {
  xPct: number;
  segments: number;
  color: string;
  layer: number;
  skillIcon?: string;
  anchorY?: number;
}

function generateFlasks(
  count: number,
  mobile: boolean,
  viewportHeight: number = 800
): FlaskConfig[] {
  const rng = mulberry32(42);
  const flasks: FlaskConfig[] = [];

  // Shuffle skills for random assignment
  const shuffledSkills = [...skills];
  for (let i = shuffledSkills.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledSkills[i], shuffledSkills[j]] = [
      shuffledSkills[j],
      shuffledSkills[i],
    ];
  }
  let skillIndex = 0;

  if (mobile) {
    // Mobile: 3 rows, each row = one layer, short chains
    const numRows = 3;
    const rowHeight = viewportHeight / numRows;
    const perRow = Math.ceil(count / numRows);
    const minDist = 0.12;

    for (let row = 0; row < numRows; row++) {
      const layer = row; // top row = layer 0 (front), bottom = layer 2 (back)
      const anchorY = row * rowHeight - 80;
      const rowPositions: number[] = [];

      for (let j = 0; j < perRow; j++) {
        let xPct = 0;
        let placed = false;
        for (let attempt = 0; attempt < 50; attempt++) {
          xPct = 0.08 + rng() * 0.84;
          const tooClose = rowPositions.some(
            (ex) => Math.abs(ex - xPct) < minDist
          );
          if (!tooClose) {
            placed = true;
            break;
          }
        }
        if (!placed) continue;

        const segments = 2 + Math.floor(rng() * 3); // 2-4 segments
        const color = FLASK_COLORS[Math.floor(rng() * FLASK_COLORS.length)];

        let skillIcon: string | undefined;
        if (layer !== 2 && skillIndex < shuffledSkills.length) {
          skillIcon = shuffledSkills[skillIndex].svgPath;
          skillIndex++;
        }

        rowPositions.push(xPct);
        flasks.push({ xPct, segments, color, layer, skillIcon, anchorY });
      }
    }
  } else {
    // Desktop: generate all flasks, then assign layers by chain length
    const rawFlasks: { xPct: number; segments: number; color: string }[] = [];

    for (let i = 0; i < count; i++) {
      const segments =
        MIN_SEGMENTS + Math.floor(rng() * (MAX_SEGMENTS - MIN_SEGMENTS + 1));
      const xPct = 0.03 + rng() * 0.94;
      const color = FLASK_COLORS[Math.floor(rng() * FLASK_COLORS.length)];
      rawFlasks.push({ xPct, segments, color });
    }

    // Sort by segments ascending: shorter chains → front (layer 0)
    rawFlasks.sort((a, b) => a.segments - b.segments);

    const layerPositions: number[][] = [[], [], []];
    const minDist = MIN_SAME_LAYER_DISTANCE_PCT;
    const third = Math.ceil(rawFlasks.length / DEPTH_LAYERS);

    for (let i = 0; i < rawFlasks.length; i++) {
      const layer = Math.min(Math.floor(i / third), DEPTH_LAYERS - 1);
      const { xPct, segments, color } = rawFlasks[i];

      const tooClose = layerPositions[layer].some(
        (existing) => Math.abs(existing - xPct) < minDist
      );
      if (tooClose) continue;

      let skillIcon: string | undefined;
      if (layer !== 2 && skillIndex < shuffledSkills.length) {
        skillIcon = shuffledSkills[skillIndex].svgPath;
        skillIndex++;
      }

      layerPositions[layer].push(xPct);
      flasks.push({ xPct, segments, color, layer, skillIcon });
    }
  }

  // Sort by layer descending (back to front) for render order
  flasks.sort((a, b) => b.layer - a.layer);
  return flasks;
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

export default function PhysicsScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engine = usePhysicsEngine();
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const wallsRef = useRef<Matter.Body[]>([]);

  useAnimationSync(engine);
  useMousePhysics(engine, containerRef);

  const isMobile = dims.width > 0 && dims.width < MOBILE_BREAKPOINT;
  const flasks = useMemo(
    () =>
      dims.width > 0
        ? generateFlasks(
            isMobile ? MOBILE_FLASK_COUNT : FLASK_COUNT,
            isMobile,
            dims.height
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dims.width > 0, isMobile]
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
  }, [engine]);

  return (
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
            anchorY={cfg.anchorY ?? -80}
            instanceId={`flask-${i}`}
            color={cfg.color}
            segmentCount={cfg.segments}
            layer={cfg.layer}
            skillIcon={cfg.skillIcon}
          />
        ))}
      <DebugPanel engine={engine} containerRef={containerRef} />
    </div>
  );
}
