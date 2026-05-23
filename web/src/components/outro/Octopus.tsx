"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PointerField } from "@/hooks/usePointerField";

/**
 * An octopus that lives its own life: it drifts on a wandering path and reacts
 * to the cursor with a simple "scare" state machine:
 *   wander → (cursor lingers close, scare builds) → darts, and if scared enough
 *   → HIDES fully off-screen (a side/bottom) for ~8–13s → peeks back from that
 *   side, calmer → if hunted again, spooks and runs off once more.
 * It never goes up over the heading text.
 */
const SPRING = 1.8;
const DAMP = 2.4;
const FLEE_R = 180; // immediate dart radius
const FLEE_FORCE = 9000;
const SCARE_R = 220; // proximity that builds fear
const SCARE_GAIN = 2.2; // fear/sec at the cursor
const SCARE_DECAY = 0.5; // fear lost/sec when left alone
const SCARE_TRIGGER = 1.4; // fear needed to flee off-screen
const HIDE_MIN = 8000;
const HIDE_RAND = 5000;
const MAX_SPEED = 1100;

export function Octopus({ pointer }: { pointer: RefObject<PointerField | null> }) {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const s = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    nextAt: 0,
    init: false,
    mode: "wander" as "wander" | "hide",
    scare: 0,
    hideUntil: 0,
    hideX: 0,
    hideY: 0,
  });

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
        st.y = H * 0.5;
        st.tx = st.x;
        st.ty = st.y;
        st.nextAt = now;
        st.init = true;
        el.style.opacity = "1";
      }

      // Distance to cursor + fear accounting.
      const p = pointer.current;
      const cursorActive = !!p && p.active;
      let dist = Infinity;
      let dirX = 0;
      let dirY = 0;
      if (cursorActive) {
        const dx = st.x - p.x;
        const dy = st.y - p.y;
        dist = Math.hypot(dx, dy) || 0.01;
        dirX = dx / dist;
        dirY = dy / dist;
      }
      if (cursorActive && dist < SCARE_R) {
        st.scare += (1 - dist / SCARE_R) * SCARE_GAIN * dt;
      } else {
        st.scare = Math.max(0, st.scare - SCARE_DECAY * dt);
      }

      let ax = 0;
      let ay = 0;

      if (st.mode === "wander") {
        // Drift toward the wander target.
        ax = (st.tx - st.x) * SPRING - st.vx * DAMP;
        ay = (st.ty - st.y) * SPRING - st.vy * DAMP;
        // Immediate dart when the cursor is right on top of it.
        if (cursorActive && dist < FLEE_R) {
          const push = (1 - dist / FLEE_R) * FLEE_FORCE;
          ax += dirX * push;
          ay += dirY * push;
        }
        // Re-pick a wander target every few seconds.
        if (now >= st.nextAt) {
          st.tx = W * (0.45 + Math.random() * 0.4);
          st.ty = H * (0.45 + Math.random() * 0.4);
          st.nextAt = now + 2600 + Math.random() * 3200;
        }
        // Scared enough → flee off-screen and hide.
        if (st.scare >= SCARE_TRIGGER) {
          st.mode = "hide";
          st.hideUntil = now + HIDE_MIN + Math.random() * HIDE_RAND;
          const goRight = cursorActive ? p.x < st.x : Math.random() < 0.5;
          st.hideX = goRight ? W + 280 : -280; // off a side
          st.hideY = H * (0.7 + Math.random() * 0.25); // low
        }
      } else {
        // Hiding: rush to the off-screen target and stay until the timer ends.
        ax = (st.hideX - st.x) * 1.5 - st.vx * 2.2;
        ay = (st.hideY - st.y) * 1.5 - st.vy * 2.2;
        if (now >= st.hideUntil) {
          st.mode = "wander";
          st.scare = 0.25; // calmer, but still wary
          st.tx = st.hideX > W * 0.5 ? W * 0.82 : W * 0.18; // peek back from that side
          st.ty = H * 0.6;
          st.nextAt = now + 2500;
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

      // Only a top limit — it may freely leave the sides/bottom to hide.
      st.y = Math.max(H * 0.4, st.y);

      // Lean into the swim direction.
      const rot = Math.max(-25, Math.min(25, st.vx * 0.045));
      el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) translate(-50%, -50%) rotate(${rot}deg)`;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pointer]);

  return (
    <div
      ref={elRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[8] select-none leading-none transition-opacity duration-700"
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
          style={{ height: 140, width: "auto", imageRendering: "pixelated", display: "block" }}
        />
      )}
    </div>
  );
}
