"use client";

import Matter from "matter-js";
import { useEffect, useRef, useState } from "react";

/**
 * Diagnostic overlay for the flask rack (advanced mode). Draws Matter.js body
 * wireframes + constraints onto a canvas sized to the sticky container, plus a
 * small live stats readout. Adapted from the POC DebugPanel, but positioned
 * `absolute inset-0` inside the scene (not fixed to the viewport) so the
 * wireframes line up with the rack.
 */
export default function PhysicsDebugOverlay({
  engine,
  containerRef,
}: {
  engine: Matter.Engine;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stats, setStats] = useState({ fps: 0, bodies: 0, awake: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let frames = 0;
    let lastSample = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const draw = () => {
      frames++;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const bodies = Matter.Composite.allBodies(engine.world);
      let awake = 0;

      for (const body of bodies) {
        const verts = body.vertices;
        if (!verts.length) continue;
        ctx.beginPath();
        ctx.moveTo(verts[0].x, verts[0].y);
        for (let j = 1; j < verts.length; j++) ctx.lineTo(verts[j].x, verts[j].y);
        ctx.closePath();
        if (body.isStatic) {
          ctx.strokeStyle = "rgba(255,209,102,0.7)";
        } else if (body.isSleeping) {
          ctx.strokeStyle = "rgba(120,220,255,0.45)";
        } else {
          ctx.strokeStyle = "rgba(120,255,170,0.85)";
          if (body.label === "flask") awake++;
        }
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const constraints = Matter.Composite.allConstraints(engine.world);
      ctx.strokeStyle = "rgba(255,120,235,0.5)";
      ctx.lineWidth = 1;
      for (const c of constraints) {
        const pA = c.bodyA
          ? {
              x: c.bodyA.position.x + (c.pointA?.x ?? 0),
              y: c.bodyA.position.y + (c.pointA?.y ?? 0),
            }
          : c.pointA;
        const pB = c.bodyB
          ? {
              x: c.bodyB.position.x + (c.pointB?.x ?? 0),
              y: c.bodyB.position.y + (c.pointB?.y ?? 0),
            }
          : c.pointB;
        if (!pA || !pB) continue;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }

      const now = performance.now();
      if (now - lastSample >= 500) {
        setStats({
          fps: Math.round((frames * 1000) / (now - lastSample)),
          bodies: bodies.length,
          awake,
        });
        frames = 0;
        lastSample = now;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [engine, containerRef]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      />
      <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-sm border border-[#1eff8c]/40 bg-black/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-[#7dffb0]">
        <div>
          <span className={stats.fps >= 50 ? "text-[#7dffb0]" : "text-[#ffd166]"}>
            {stats.fps} FPS
          </span>
        </div>
        <div>{stats.bodies} bodies</div>
        <div>{stats.awake} flasks awake</div>
      </div>
    </>
  );
}
