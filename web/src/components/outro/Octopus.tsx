"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PointerField } from "@/hooks/usePointerField";
import { useAppStore } from "@/store/useAppStore";
import type { InkHandle } from "./InkCloud";
import { classifyTap, enoughOnTaps, INK_TAPS, INK_WINDOW, INK_COOLDOWN, INK_DROP, INK_DASH_DELAY } from "@/lib/outro/ink";
import { smoothSpeed, nextMode, FLEE_EXIT_SPEED, SPOOK_MS, type OctoMode } from "@/lib/outro/octopusMotion";

/**
 * Cursor-aware octopus (reacts to the real cursor — we never move it):
 *  - cursor still → curious: it loops AROUND the cursor on a wobbly, randomised
 *    orbit (radius + angular speed vary, re-seeded each session — not a flat circle);
 *  - cursor moving → afraid: it steers away (quicker the more scared it is), and
 *    persistent close hunting builds scare → it darts off-screen to hide, then
 *    sneaks back.
 * Speed varies with mood: gentle while orbiting, quick while fleeing.
 * In advanced mode it draws its target trail so the motion is easy to debug.
 */
const DAMP = 2.4;
const SPRING = 1.5; // gentler pull to the spot → eases in, doesn't dart
const AVOID_R = 340;
const AVOID_FORCE = 5200;
const PERSONAL_R = 185; // approach this close and he backs off (every mood, calm)
const PERSONAL_FORCE = 4600;
const SCARE_GAIN = 0.9; // scare/sec accrued while actively fleeing → panic-hide
const SCARE_DECAY = 0.6;
const SCARE_TRIGGER = 1.4;
const HIDE_MIN = 7000;
const HIDE_RAND = 4000;
const ORBIT_R = 200; // curious orbit sits just outside the personal-space gap
const ORBIT_SPEED = 2.0;
const ORBIT_K = 3.2;
const MIN_GAP = 118; // hard floor: the octopus never gets closer than this to the cursor
// Mood-based speed caps (px/s): calm orbit < wary avoid < panicked flee.
const SPEED_ORBIT = 540;
const SPEED_WARY = 520; // roam travel cap — calmer, no zipping side-to-side
const SPEED_FLEE = 1040;
const SPEED_DASH = 1320; // brief burst when he jumps away after inking
const TAU = Math.PI * 2;

// Favourite hangouts (fractions of the scene) the octopus drifts between when it
// isn't reacting to the cursor — weighted so it has habits, not pure randomness.
const SPOTS: { x: number; y: number; w: number }[] = [
  { x: 0.24, y: 0.74, w: 4 }, // tucked behind the front kelp
  { x: 0.05, y: 0.6, w: 3 }, //  lurking at the left edge
  { x: 0.95, y: 0.6, w: 3 }, //  lurking at the right edge
  { x: 0.5, y: 0.56, w: 1 }, //  open water (rarely)
  { x: 0.72, y: 0.72, w: 1 }, // sand, right of centre
];
const SPOT_TOTAL = SPOTS.reduce((sum, p) => sum + p.w, 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Weighted pick of a favourite spot, with a little jitter so it's never exact. */
function pickSpot(W: number, H: number): { x: number; y: number } {
  let r = Math.random() * SPOT_TOTAL;
  let spot = SPOTS[0];
  for (const p of SPOTS) {
    r -= p.w;
    if (r <= 0) { spot = p; break; }
  }
  return {
    x: clamp(spot.x + (Math.random() - 0.5) * 0.12, 0.02, 0.98) * W,
    y: clamp(spot.y + (Math.random() - 0.5) * 0.1, 0.45, 0.85) * H,
  };
}

export function Octopus({
  pointer,
  tapRef,
  inkRef,
}: {
  pointer: RefObject<PointerField | null>;
  tapRef: RefObject<{ x: number; y: number; t: number } | null>;
  inkRef: RefObject<InkHandle | null>;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [failed, setFailed] = useState(false);
  const advanced = useAppStore((s) => s.advanced);
  const s = useRef({
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, nextAt: 0, init: false,
    mode: "wander" as "wander" | "hide",
    scare: 0, hideUntil: 0, hideX: 0, hideY: 0,
    orbitAngle: 0, wasIdle: false, wob1: 0, wob2: 0, wob3: 0,
    goalX: 0, goalY: 0,
    noiseX: 0, noiseY: 0, noiseTX: 0, noiseTY: 0, noiseAt: 0,
    trail: [] as number[],
    onTaps: [] as number[], inkCooldownUntil: 0, lastTapT: 0,
    lastTapX: 0, lastTapY: 0, inkDashAt: 0, dashDirX: 0, dashDirY: 0, dashUntil: 0,
    cspeed: 0, prevCx: 0, prevCy: 0, prevDist: Infinity, calmMs: 0,
    cmode: "roam" as OctoMode, prevCmode: "roam" as OctoMode, rot: 0,
    paceSeed: 0, meanderSeed: 0, meanderSeed2: 0, spookedUntil: 0,
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
        st.x = W * 0.5; st.y = H * 0.5; st.tx = st.x; st.ty = st.y;
        st.nextAt = now; st.init = true; el.style.opacity = "1";
        st.paceSeed = Math.random() * TAU;
        st.meanderSeed = Math.random() * TAU;
        st.meanderSeed2 = Math.random() * TAU;
      }

      const p = pointer.current;
      let cActive = false, cx = 0, cy = 0, cMovedAt = 0;
      if (p && p.active) { cActive = true; cx = p.x; cy = p.y; cMovedAt = p.movedAt; }

      let dist = Infinity, dirX = 0, dirY = 0;
      if (cActive) {
        const dx = st.x - cx, dy = st.y - cy;
        dist = Math.hypot(dx, dy) || 0.01;
        dirX = dx / dist; dirY = dy / dist;
      }
      // Cursor speed (px/s), EMA-smoothed — the pointer field only gives
      // per-event deltas, so derive it; a placed cursor decays this to ~0.
      let cspeed = 0;
      if (cActive) {
        const inst = Math.hypot(cx - st.prevCx, cy - st.prevCy) / Math.max(dt, 0.001);
        cspeed = smoothSpeed(st.cspeed, inst, 0.2);
      }
      st.cspeed = cspeed;
      st.prevCx = cx; st.prevCy = cy;
      const closing = cActive && dist < st.prevDist;
      st.prevDist = dist;
      st.calmMs = cspeed < FLEE_EXIT_SPEED ? st.calmMs + dt * 1000 : 0;
      // He's always cursor-aware; this only decides his mood toward it. After a
      // knock/flee he stays "spooked" and won't warm back to curious until the
      // cursor settles (handled in nextMode via spooked + the calm delay).
      st.cmode = nextMode(st.cmode, {
        cActive, cspeed, dist, closing,
        calmMs: st.calmMs,
        spooked: now < st.spookedUntil,
      });
      if (st.cmode === "flee") st.spookedUntil = now + SPOOK_MS; // stay wary after
      void cMovedAt;

      // Scare builds only while actively fleeing → sustained harassment = panic-hide.
      if (st.cmode === "flee") st.scare += SCARE_GAIN * dt;
      else st.scare = Math.max(0, st.scare - SCARE_DECAY * dt);

      // Taps (mobile tap / desktop click) poke the octopus: "on" builds toward
      // ink, "around" just makes him dart off (scared). Cursor-chase ink is the
      // separate scare path below (desktop high tier only).
      const tap = tapRef.current;
      if (tap && tap.t > st.lastTapT) {
        st.lastTapT = tap.t;
        const tdist = Math.hypot(tap.x - st.x, tap.y - st.y) || 0.01;
        const cls = classifyTap(tdist);
        if (cls !== "miss") {
          st.lastTapX = tap.x; st.lastTapY = tap.y;
          st.spookedUntil = now + SPOOK_MS; // knocked → stay wary, don't rush back
          // "around" → dart off (scared). "on" → only a small flinch so he stays
          // put to receive the next tap; the big move is the post-ink dash.
          const push = cls === "on" ? 230 : 820;
          st.vx += ((st.x - tap.x) / tdist) * push;
          st.vy += ((st.y - tap.y) / tdist) * push;
          if (cls === "on") {
            st.onTaps.push(now);
            if (st.onTaps.length > 8) st.onTaps.shift();
          }
          if (useAppStore.getState().advanced) {
            const recent = st.onTaps.filter((t) => now - t <= INK_WINDOW).length;
            console.log(`[octopus] poke ${cls} dist=${Math.round(tdist)} onTaps=${recent}/${INK_TAPS}`);
          }
        }
      }
      // Enough on-taps → squirt ink at his lower middle NOW, then dash away after
      // it has had a moment to bloom (so the ink isn't left where he already was).
      if (enoughOnTaps(st.onTaps, now) && now >= st.inkCooldownUntil && !st.inkDashAt) {
        if (useAppStore.getState().advanced) {
          console.log(
            `[octopus] INK emit (taps) @ (${Math.round(st.x)}, ${Math.round(st.y + INK_DROP)})`,
          );
        }
        inkRef.current?.emit(st.x, st.y + INK_DROP);
        st.inkCooldownUntil = now + INK_COOLDOWN;
        st.onTaps = [];
        // Dash direction: away from the last poke, with an upward "jump" lean.
        const ddx = st.x - st.lastTapX;
        const ddy = st.y - st.lastTapY - 60;
        const dd = Math.hypot(ddx, ddy) || 1;
        st.dashDirX = ddx / dd;
        st.dashDirY = ddy / dd;
        st.inkDashAt = now + INK_DASH_DELAY;
      }
      // Deferred dash: fires once the ink has bloomed.
      if (st.inkDashAt && now >= st.inkDashAt) {
        st.vx = st.dashDirX * SPEED_DASH;
        st.vy = st.dashDirY * SPEED_DASH;
        st.dashUntil = now + 450;
        st.inkDashAt = 0;
      }

      let ax = 0, ay = 0;
      let cap = SPEED_WARY;

      if (st.mode === "wander") {
        if (st.cmode === "curious" && cActive) {
          if (st.prevCmode !== "curious") {
            // Entering curiosity → reseed the loop wobble so it's never the
            // same shape twice.
            st.wob1 = Math.random() * TAU;
            st.wob2 = Math.random() * TAU;
            st.wob3 = Math.random() * TAU;
          }
          // Curious: a wobbly loop AROUND the cursor — he watches and circles it.
          st.orbitAngle += ORBIT_SPEED * (1 + 0.5 * Math.sin(now * 0.0013 + st.wob1)) * dt;
          const rWob =
            ORBIT_R +
            Math.sin(st.orbitAngle * 2 + st.wob2) * 34 +
            Math.sin(st.orbitAngle * 1.3 + st.wob3) * 20 +
            Math.sin(now * 0.0004 + st.wob1) * 46; // slow lean in/out = investigating
          // Smoothed random-walk noise so the loop isn't a clean function.
          if (now >= st.noiseAt) {
            st.noiseTX = (Math.random() - 0.5) * 55;
            st.noiseTY = (Math.random() - 0.5) * 55;
            st.noiseAt = now + 500 + Math.random() * 800;
          }
          st.noiseX += (st.noiseTX - st.noiseX) * 0.05;
          st.noiseY += (st.noiseTY - st.noiseY) * 0.05;
          let tx2 = cx + Math.cos(st.orbitAngle) * rWob + st.noiseX;
          let ty2 = cy + Math.sin(st.orbitAngle) * rWob + st.noiseY;
          // Keep the orbit target outside the gap so it circles, never overlaps.
          const td = Math.hypot(tx2 - cx, ty2 - cy) || 1;
          if (td < MIN_GAP + 25) {
            const k = (MIN_GAP + 25) / td;
            tx2 = cx + (tx2 - cx) * k;
            ty2 = cy + (ty2 - cy) * k;
          }
          st.goalX = tx2; st.goalY = ty2;
          ax = (tx2 - st.x) * ORBIT_K - st.vx * DAMP;
          ay = (ty2 - st.y) * ORBIT_K - st.vy * DAMP;
          cap = SPEED_ORBIT;
        } else {
          // roam (or flee): travel toward a favourite spot. He keeps the orbit
          // angle synced so slipping into curiosity is seamless.
          if (cActive) st.orbitAngle = Math.atan2(st.y - cy, st.x - cx);
          // Organic path: arc toward the spot via a slow perpendicular meander so
          // it never looks like a straight scripted line. Fleeing stays direct.
          let gx = st.tx, gy = st.ty;
          if (st.cmode !== "flee") {
            const toX = st.tx - st.x, toY = st.ty - st.y;
            const tl = Math.hypot(toX, toY) || 1;
            const meander =
              Math.sin(now * 0.0011 + st.meanderSeed) * 70 +
              Math.sin(now * 0.0007 + st.meanderSeed2) * 40;
            gx += (-toY / tl) * meander;
            gy += (toX / tl) * meander;
          }
          ax = (gx - st.x) * SPRING - st.vx * DAMP;
          ay = (gy - st.y) * SPRING - st.vy * DAMP;
          if (st.cmode === "flee" && cActive && dist < AVOID_R) {
            // A genuine lunge adds the bigger panic push on top.
            const f = Math.pow(1 - dist / AVOID_R, 1.6) * AVOID_FORCE;
            ax += dirX * f; ay += dirY * f;
            cap = SPEED_WARY + st.scare * 220; // more scared → quicker getaway
          }
          // Travel between favourite spots: re-pick on arrival (or after a
          // timeout) so it deliberately visits its haunts, not random points.
          if (Math.hypot(st.tx - st.x, st.ty - st.y) < 70 || now >= st.nextAt) {
            const spot = pickSpot(W, H);
            st.tx = spot.x;
            st.ty = spot.y;
            st.nextAt = now + 2200 + Math.random() * 3400;
          }
          st.goalX = st.tx; st.goalY = st.ty;
          if (st.scare >= SCARE_TRIGGER) {
            // Sustained fleeing → panic: squirt ink as he bolts off-screen.
            if (now >= st.inkCooldownUntil) {
              if (useAppStore.getState().advanced) {
                console.log(`[octopus] INK emit (panic) scare=${st.scare.toFixed(2)}`);
              }
              inkRef.current?.emit(st.x, st.y + INK_DROP);
              st.inkCooldownUntil = now + INK_COOLDOWN;
            }
            st.mode = "hide";
            st.hideUntil = now + HIDE_MIN + Math.random() * HIDE_RAND;
            const goRight = cActive ? cx < st.x : Math.random() < 0.5;
            st.hideX = goRight ? W + 280 : -280;
            st.hideY = H * (0.7 + Math.random() * 0.25);
          }
        }
      } else {
        // Fleeing → strong pull + high cap, so it darts away fast.
        ax = (st.hideX - st.x) * 2.4 - st.vx * 2.2;
        ay = (st.hideY - st.y) * 2.4 - st.vy * 2.2;
        st.goalX = st.hideX; st.goalY = st.hideY;
        cap = SPEED_FLEE;
        if (now >= st.hideUntil) {
          st.mode = "wander";
          st.scare = 0.25;
          st.tx = st.hideX > W * 0.5 ? W * 0.82 : W * 0.18;
          st.ty = H * 0.6;
          st.nextAt = now + 2500;
        }
      }
      st.prevCmode = st.cmode;

      // Personal space, every mood: the closer the cursor, the harder he's
      // pushed directly away — approaching him makes him back off. Calm
      // gap-keeping (the panic bolt is the separate AVOID/scare flee path).
      if (cActive && dist < PERSONAL_R) {
        const f = Math.pow(1 - dist / PERSONAL_R, 1.8) * PERSONAL_FORCE;
        ax += dirX * f; ay += dirY * f;
      }

      // Varied pace: ease the cap up and down slowly so he visibly speeds up and
      // slows down — not metronomic. Not while fleeing or dashing.
      if (st.mode === "wander" && st.cmode !== "flee" && now >= st.dashUntil) {
        cap *= 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(now * 0.0006 + st.paceSeed));
      }

      st.vx += ax * dt;
      st.vy += ay * dt;
      // Allow the brief post-ink dash to exceed the normal mood cap.
      if (now < st.dashUntil) cap = Math.max(cap, SPEED_DASH);
      const sp = Math.hypot(st.vx, st.vy);
      if (sp > cap) { st.vx = (st.vx / sp) * cap; st.vy = (st.vy / sp) * cap; }
      st.x += st.vx * dt;
      st.y += st.vy * dt;

      // Never touch the cursor — hold a fair gap and only ever swim around it.
      if (cActive) {
        const gdx = st.x - cx;
        const gdy = st.y - cy;
        const gd = Math.hypot(gdx, gdy);
        if (gd < MIN_GAP) {
          const nx = gd > 0.01 ? gdx / gd : 1;
          const ny = gd > 0.01 ? gdy / gd : 0;
          st.x = cx + nx * MIN_GAP;
          st.y = cy + ny * MIN_GAP;
          const vr = st.vx * nx + st.vy * ny; // cancel any inward velocity
          if (vr < 0) {
            st.vx -= vr * nx;
            st.vy -= vr * ny;
          }
        }
      }

      // Ease the tilt toward the velocity-based target so left↔right turns are
      // smooth, not abrupt snaps when he reverses (dt-aware, ~framerate stable).
      const targetRot = Math.max(-25, Math.min(25, st.vx * 0.045));
      st.rot += (targetRot - st.rot) * Math.min(1, dt * 6);
      const rot = st.rot;
      // Anchor on the octopus's MASS centre (47%,58% of the gif), not the
      // geometric centre, so the orbit/avoid maths track the creature itself.
      // Idle micro-motion: a tiny always-on bob/sway so he never looks frozen
      // (purely visual — doesn't touch the physics or the cursor gap).
      const bobX = Math.sin(now * 0.0012) * 3 + Math.sin(now * 0.0019 + 1.3) * 2;
      const bobY = Math.sin(now * 0.0009 + 0.7) * 4 + Math.sin(now * 0.0022) * 2;
      el.style.transform = `translate3d(${st.x + bobX}px, ${st.y + bobY}px, 0) translate(-47%, -58%) rotate(${rot}deg)`;

      // Advanced-mode debug: a fading trail of the goal point, plus the octopus
      // and a link line — so the orbit/flee path is visible.
      // Matter.js-style wireframe debug: transparent canvas (never darkens the
      // scene), coloured lines — green actual path, red "where it's going"
      // vector + goal, cyan octopus, yellow rings for its favourite spots.
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        if (cv.width !== Math.round(W) || cv.height !== Math.round(H)) {
          cv.width = Math.round(W);
          cv.height = Math.round(H);
        }
        st.trail.push(st.x, st.y);
        if (st.trail.length > 160) st.trail.splice(0, st.trail.length - 160);
        ctx.clearRect(0, 0, cv.width, cv.height);

        ctx.lineWidth = 1.5; // favourite spots (sized by preference weight)
        ctx.strokeStyle = "rgba(255,210,70,0.55)";
        for (const sp of SPOTS) {
          ctx.beginPath();
          ctx.arc(sp.x * W, sp.y * H, 7 + sp.w * 3, 0, TAU);
          ctx.stroke();
        }
        ctx.lineWidth = 2; // actual path, fading toward the tail
        for (let i = 2; i < st.trail.length; i += 2) {
          ctx.strokeStyle = `rgba(80,255,150,${(i / st.trail.length) * 0.8})`;
          ctx.beginPath();
          ctx.moveTo(st.trail[i - 2], st.trail[i - 1]);
          ctx.lineTo(st.trail[i], st.trail[i + 1]);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255,70,70,0.9)"; // heading vector + goal
        ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.goalX, st.goalY); ctx.stroke();
        ctx.fillStyle = "rgba(255,70,70,0.95)";
        ctx.beginPath(); ctx.arc(st.goalX, st.goalY, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(90,210,255,1)"; // octopus
        ctx.beginPath(); ctx.arc(st.x, st.y, 4.5, 0, TAU); ctx.fill();
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pointer]);

  return (
    <>
      {advanced && (
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[20]" />
      )}
      <div
        ref={elRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-[8] select-none leading-none transition-opacity duration-700"
        style={{ willChange: "transform", opacity: 0, transformOrigin: "47% 58%" }}
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
            style={{ height: 160, width: "auto", imageRendering: "pixelated", display: "block" }}
          />
        )}
      </div>
    </>
  );
}
