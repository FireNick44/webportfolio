"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PointerField } from "@/hooks/usePointerField";
import { cursorCapture } from "@/lib/outro/cursorCapture";

/**
 * An octopus that lives its own life and is cursor-aware:
 *  - it CONTINUOUSLY, smoothly steers away from the cursor (it always knows the
 *    pointer's x/y, so it never bumps into it and stutters);
 *  - persistent hunting builds "scare" → it flees fully off-screen and hides
 *    ~8–13s, then peeks back calmer;
 *  - hunt it enough that it gets "too angry" → it GRABS the custom cursor, drags
 *    it off-screen, and flings it back in from that side (High + desktop only).
 * It never drifts up over the heading text (except while grabbing/carrying).
 */
const SPRING = 1.8;
const DAMP = 2.4;
const AVOID_R = 340; // it starts easing away this far out
const AVOID_FORCE = 5200;
const SCARE_R = 220;
const SCARE_GAIN = 2.0;
const SCARE_DECAY = 0.5;
const SCARE_TRIGGER = 1.6;
const ANGER_DECAY = 0.04;
const ANGER_CAPTURE = 2;
const HIDE_MIN = 8000;
const HIDE_RAND = 5000;
const MAX_SPEED = 1100;
const CAPTURE_COOLDOWN = 22000;

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
    mode: "wander" as "wander" | "hide" | "grab" | "carry",
    scare: 0,
    anger: 0,
    hideUntil: 0,
    hideX: 0,
    hideY: 0,
    carryX: 0,
    carryY: 0,
    grabUntil: 0,
    captureReadyAt: 0,
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
      const ox = rect?.left || 0;
      const oy = rect?.top || 0;

      if (!st.init) {
        st.x = W * 0.5;
        st.y = H * 0.5;
        st.tx = st.x;
        st.ty = st.y;
        st.nextAt = now;
        st.init = true;
        el.style.opacity = "1";
      }

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
      if (cursorActive && dist < SCARE_R) st.scare += (1 - dist / SCARE_R) * SCARE_GAIN * dt;
      else st.scare = Math.max(0, st.scare - SCARE_DECAY * dt);
      st.anger = Math.max(0, st.anger - ANGER_DECAY * dt);

      let ax = 0;
      let ay = 0;

      if (st.mode === "wander") {
        ax = (st.tx - st.x) * SPRING - st.vx * DAMP;
        ay = (st.ty - st.y) * SPRING - st.vy * DAMP;
        // Continuous, smooth avoidance — eases away well before contact.
        if (cursorActive && dist < AVOID_R) {
          const f = Math.pow(1 - dist / AVOID_R, 1.6) * AVOID_FORCE;
          ax += dirX * f;
          ay += dirY * f;
        }
        if (now >= st.nextAt) {
          st.tx = W * (0.45 + Math.random() * 0.4);
          st.ty = H * (0.45 + Math.random() * 0.4);
          st.nextAt = now + 2600 + Math.random() * 3200;
        }
        if (st.scare >= SCARE_TRIGGER) {
          if (cursorActive && st.anger >= ANGER_CAPTURE && now >= st.captureReadyAt) {
            st.mode = "grab";
            st.grabUntil = now + 2600;
          } else {
            st.mode = "hide";
            st.anger += 1;
            st.hideUntil = now + HIDE_MIN + Math.random() * HIDE_RAND;
            const goRight = cursorActive ? p.x < st.x : Math.random() < 0.5;
            st.hideX = goRight ? W + 280 : -280;
            st.hideY = H * (0.7 + Math.random() * 0.25);
          }
        }
      } else if (st.mode === "grab") {
        if (!cursorActive || now > st.grabUntil) {
          st.mode = "hide";
          st.hideUntil = now + HIDE_MIN;
          st.hideX = st.x > W / 2 ? W + 280 : -280;
          st.hideY = H * 0.75;
        } else {
          ax = (p.x - st.x) * 5 - st.vx * 3;
          ay = (p.y - st.y) * 5 - st.vy * 3;
          if (dist < 40) {
            st.mode = "carry";
            cursorCapture.held = true;
            const goRight = st.x > W / 2;
            st.carryX = goRight ? W + 360 : -360;
            st.carryY = H * (0.5 + Math.random() * 0.3);
          }
        }
      } else if (st.mode === "carry") {
        ax = (st.carryX - st.x) * 2.6 - st.vx * 2.4;
        ay = (st.carryY - st.y) * 2.6 - st.vy * 2.4;
        cursorCapture.x = ox + st.x; // pin the cursor to the octopus (viewport)
        cursorCapture.y = oy + st.y;
        if (st.x < -240 || st.x > W + 240) {
          cursorCapture.held = false; // release → cursor shoots back from this side
          st.mode = "hide";
          st.scare = 0;
          st.anger = 0;
          st.captureReadyAt = now + CAPTURE_COOLDOWN;
          st.hideUntil = now + 4000 + Math.random() * 3000;
          st.hideX = st.x;
          st.hideY = H * 0.8;
        }
      } else {
        ax = (st.hideX - st.x) * 1.5 - st.vx * 2.2;
        ay = (st.hideY - st.y) * 1.5 - st.vy * 2.2;
        if (now >= st.hideUntil) {
          st.mode = "wander";
          st.scare = 0.25;
          st.tx = st.hideX > W * 0.5 ? W * 0.82 : W * 0.18;
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

      // Top limit only while calm — during grab/carry it may reach the cursor anywhere.
      if (st.mode === "wander" || st.mode === "hide") st.y = Math.max(H * 0.4, st.y);

      const rot = Math.max(-25, Math.min(25, st.vx * 0.045));
      el.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) translate(-50%, -50%) rotate(${rot}deg)`;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      cursorCapture.held = false; // release if unmounted mid-capture
    };
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
