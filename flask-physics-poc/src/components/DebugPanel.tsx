import { useState, useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";

interface Props {
  engine: Matter.Engine;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function DebugPanel({ engine, containerRef }: Props) {
  const [showFps, setShowFps] = useState(false);
  const [showPhysics, setShowPhysics] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        top: 52,
        right: 8,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "flex-end",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <DebugButton active={showFps} onClick={() => setShowFps((v) => !v)}>
          FPS
        </DebugButton>
        <DebugButton
          active={showPhysics}
          onClick={() => setShowPhysics((v) => !v)}
        >
          Physics
        </DebugButton>
        <DebugButton
          active={showUpdates}
          onClick={() => setShowUpdates((v) => !v)}
        >
          Updates
        </DebugButton>
      </div>

      {showFps && <FpsOverlay engine={engine} />}
      {showPhysics && (
        <PhysicsOverlay engine={engine} containerRef={containerRef} />
      )}
      {showUpdates && <UpdatesOverlay engine={engine} />}
    </div>
  );
}

function DebugButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 11,
        fontFamily: "monospace",
        background: active ? "rgba(0,255,100,0.3)" : "rgba(255,255,255,0.1)",
        color: active ? "#0f0" : "#888",
        border: `1px solid ${active ? "#0f0" : "#444"}`,
        borderRadius: 4,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      {children}
    </button>
  );
}

// --- FPS + Events overlay ---
function FpsOverlay({ engine }: { engine: Matter.Engine }) {
  const [fps, setFps] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [constraintCount, setConstraintCount] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const frameCountRef = useRef(0);

  const addEvent = useCallback((msg: string) => {
    setEvents((prev) => [msg, ...prev].slice(0, 12));
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCountRef.current);
        setBodyCount(Matter.Composite.allBodies(engine.world).length);
        setConstraintCount(
          Matter.Composite.allConstraints(engine.world).length
        );
        frameCountRef.current = 0;
        lastTime = now;
      }
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    const onCollision = (e: Matter.IEventCollision<Matter.Engine>) => {
      const pair = e.pairs[0];
      if (pair) {
        addEvent(
          `collision: ${pair.bodyA.label} ↔ ${pair.bodyB.label}`
        );
      }
    };

    Matter.Events.on(engine, "collisionStart", onCollision);

    return () => {
      cancelAnimationFrame(raf);
      Matter.Events.off(engine, "collisionStart", onCollision);
    };
  }, [engine, addEvent]);

  return (
    <div style={panelStyle}>
      <div>
        <span style={{ color: fps >= 55 ? "#0f0" : fps >= 30 ? "#ff0" : "#f00" }}>
          {fps} FPS
        </span>
        {" | "}
        {bodyCount} bodies | {constraintCount} constraints
      </div>
      <div style={{ marginTop: 4, fontSize: 9, maxHeight: 120, overflow: "hidden" }}>
        {events.map((e, i) => (
          <div key={i} style={{ opacity: 1 - i * 0.07 }}>
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Physics debug canvas overlay (manual wireframe drawing) ---
function PhysicsOverlay({
  engine,
  containerRef,
}: {
  engine: Matter.Engine;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bodies = Matter.Composite.allBodies(engine.world);

      for (const body of bodies) {
        const verts = body.vertices;
        if (!verts.length) continue;

        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let j = 1; j < verts.length; j++) {
          ctx.lineTo(verts[j].x, verts[j].y);
        }
        ctx.closePath();

        if (body.isSleeping) {
          ctx.strokeStyle = "rgba(0,255,255,0.3)";
        } else if (body.isStatic) {
          ctx.strokeStyle = "rgba(255,255,0,0.5)";
        } else {
          ctx.strokeStyle = "rgba(0,255,0,0.6)";
        }
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw constraints
      const constraints = Matter.Composite.allConstraints(engine.world);
      ctx.strokeStyle = "rgba(255,100,255,0.4)";
      ctx.lineWidth = 1;
      for (const c of constraints) {
        if (!c.bodyA || !c.bodyB) continue;
        const pA = c.pointA
          ? { x: c.bodyA.position.x + c.pointA.x, y: c.bodyA.position.y + c.pointA.y }
          : c.bodyA.position;
        const pB = c.pointB
          ? { x: c.bodyB.position.x + c.pointB.x, y: c.bodyB.position.y + c.pointB.y }
          : c.bodyB.position;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(raf);
  }, [engine, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}

// --- DOM updates overlay ---
function UpdatesOverlay({ engine }: { engine: Matter.Engine }) {
  const [stats, setStats] = useState({
    awakeBodies: 0,
    sleepingBodies: 0,
    totalUpdatesPerSec: 0,
  });
  const updateCountRef = useRef(0);

  useEffect(() => {
    const onAfterUpdate = () => {
      updateCountRef.current++;
    };
    Matter.Events.on(engine, "afterUpdate", onAfterUpdate);

    const interval = setInterval(() => {
      const bodies = Matter.Composite.allBodies(engine.world);
      const awake = bodies.filter((b) => !b.isSleeping && !b.isStatic).length;
      const sleeping = bodies.filter((b) => b.isSleeping).length;
      setStats({
        awakeBodies: awake,
        sleepingBodies: sleeping,
        totalUpdatesPerSec: updateCountRef.current,
      });
      updateCountRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(interval);
      Matter.Events.off(engine, "afterUpdate", onAfterUpdate);
    };
  }, [engine]);

  return (
    <div style={panelStyle}>
      <div>Awake: {stats.awakeBodies} | Sleeping: {stats.sleepingBodies}</div>
      <div>
        Engine:{" "}
        {stats.totalUpdatesPerSec === 0 ? (
          <span style={{ color: "#0ff" }}>SUSPENDED (idle = 0 CPU)</span>
        ) : (
          `${stats.totalUpdatesPerSec} ticks/s`
        )}
      </div>
      <div>
        DOM elements synced/frame: ~
        {stats.awakeBodies > 0
          ? stats.awakeBodies + Math.ceil(stats.awakeBodies / 9)
          : 0}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.85)",
  color: "#0f0",
  fontFamily: "monospace",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid #333",
  minWidth: 200,
  pointerEvents: "auto",
};
