"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PointerField } from "@/hooks/usePointerField";

/**
 * An octopus that lives its own life: it drifts along a gentle wandering path
 * (re-picking a target every few seconds), and DARTS AWAY when the cursor gets
 * close. It does not follow the pointer — the pointer repels it.
 *
 * Feel is tunable below: SPRING/DAMP (wander), FLEE_R/FLEE_FORCE (escape),
 * MAX_SPEED, and the re-target cadence.
 */
const SPRING = 1.8;
const DAMP = 2.4;
const FLEE_R = 180;
const FLEE_FORCE = 9000;
const MAX_SPEED = 950;

export function Octopus({ pointer }: { pointer: RefObject<PointerField | null> }) {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const s = useRef({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, nextAt: 0, init: false });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const scene = el.parentElement;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const st = s.current;
      const rect = scene?.getBoundingClientRect();
      const W = rect?.width || 800;
      const H = rect?.height || 400;

      if (!st.init) {
        st.x = W * 0.5;
        st.y = H * 0.4;
        st.tx = st.x;
        st.ty = st.y;
        st.nextAt = now;
        st.init = true;
        el.style.opacity = "1";
      }

      // Re-pick a wander target every few seconds (upper ~two-thirds of water).
      if (now >= st.nextAt) {
        st.tx = W * (0.15 + Math.random() * 0.7);
        st.ty = H * (0.18 + Math.random() * 0.42);
        st.nextAt = now + 2600 + Math.random() * 3200;
      }

      // Damped spring toward the wander target.
      let ax = (st.tx - st.x) * SPRING - st.vx * DAMP;
      let ay = (st.ty - st.y) * SPRING - st.vy * DAMP;

      // Flee the cursor when it's near.
      const p = pointer.current;
      if (p && p.active) {
        const dx = st.x - p.x;
        const dy = st.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < FLEE_R && d > 0.01) {
          const push = (1 - d / FLEE_R) * FLEE_FORCE;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
        }
      }

      st.vx += ax * dt;
      st.vy += ay * dt;
      const sp = Math.hypot(st.vx, st.vy);
      if (sp > MAX_SPEED) {
        st.vx = (st.vx / sp) * MAX_SPEED;
        st.vy = (st.vy / sp) * MAX_SPEED;
      }
      st.x += st.vx * dt;
      st.y += st.vy * dt;

      // Keep it in the water, above the floor.
      const m = 44;
      st.x = Math.max(m, Math.min(W - m, st.x));
      st.y = Math.max(m, Math.min(H * 0.78, st.y));

      el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) translate(-50%, -50%)`;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pointer]);

  return (
    <div
      ref={elRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[7] select-none leading-none transition-opacity duration-700"
      style={{ willChange: "transform", opacity: 0 }}
    >
      {failed ? (
        <span className="text-5xl">🐙</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/underwater/octopus.gif"
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          style={{ height: 100, width: "auto", imageRendering: "pixelated", display: "block" }}
        />
      )}
    </div>
  );
}
