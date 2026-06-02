"use client";

import { useEffect, useRef } from "react";

const SOLO_SIZE = 118;
const SOLO_DUR = 16000; // avg ms for one crossing (loops continuously)

// Family: lead crab + two trailing little ones (size, x-offset from lead, bob phase).
const FAMILY = [
  { size: 118, dx: 0, phase: 0 },
  { size: 80, dx: -104, phase: 0.7 },
  { size: 68, dx: -182, phase: 1.4 },
];
const FAM_DUR = 18000; // avg ms for one crossing
const FAM_GAP_MIN = 14000;
const FAM_GAP_RAND = 12000;
const FAM_START_DELAY = 3000;
const TAU = Math.PI * 2;

const randDir = (): 1 | -1 => (Math.random() < 0.5 ? 1 : -1);
// Always-forward speed that wobbles 0.4×–1.6× so a crab visibly slows then
// speeds up as it walks (phase re-rolled each crossing for variety).
const speedMul = (now: number, phase: number) => 1 + 0.6 * Math.sin(now * 0.0011 + phase);

// "Shoot the crab" gag: tap/click a crab → it drops straight down beneath the
// sand (z-index under the floor) and stays gone for the rest of that walk. It
// only returns as a FRESH crossing — the solo crab after a gap, a family member
// on the family's next stroll — never popping back mid-walk. Purely visual.
const CRAB_COUNT = 4; // index 0 = solo, 1..3 = family members
const DEATH_FALL = 700; // ms: straight drop under the sand
const DEATH_DROP = 220; // px it falls (past the sand line, out of view)
const SOLO_RESPAWN_MIN = 7000; // ms before a shot solo crab starts a new crossing
const SOLO_RESPAWN_RAND = 9000;
type DeadState = { hit: boolean; hitAt: number; x: number; dir: 1 | -1 };

/**
 * Two independent crab events, each animated as a directly-transformed <img>
 * (the approach that actually renders). Each pass picks a random direction and
 * flips the sprite (scaleX) to face the way it walks, and walks at a varying
 * pace:
 *  - a solo crab looping continuously across the sand;
 *  - a separate family (lead + two trailing) that strolls by periodically.
 */
export function Crab() {
  const soloRef = useRef<HTMLImageElement>(null);
  const famRefs = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef(0);
  const initRef = useRef(false);
  const lastRef = useRef(0);
  const solo = useRef({
    prog: 0,
    dir: 1 as 1 | -1,
    phase: 0,
    waiting: false,
    until: 0,
  });
  const fam = useRef({ prog: 0, dir: 1 as 1 | -1, phase: 0, waiting: true, until: 0 });

  // Per-crab death state + live position (for hit capture). Index 0 = solo.
  const dead = useRef<DeadState[]>(
    Array.from({ length: CRAB_COUNT }, () => ({ hit: false, hitAt: 0, x: 0, dir: 1 })),
  );
  const lastX = useRef<number[]>(Array(CRAB_COUNT).fill(0));
  const lastDir = useRef<(1 | -1)[]>(Array(CRAB_COUNT).fill(1));

  // Apply either the death drop (when hit) or the normal walk transform to a crab
  // img. A shot crab falls STRAIGHT down (no spin), then stays hidden — it does
  // NOT respawn here; reviving happens only when a fresh crossing starts.
  const render = (
    el: HTMLImageElement,
    idx: number,
    x: number,
    y: number,
    dir: 1 | -1,
    visible: boolean,
    now: number,
  ) => {
    lastX.current[idx] = x;
    lastDir.current[idx] = dir;
    const d = dead.current[idx];
    if (d.hit) {
      const tt = Math.min((now - d.hitAt) / DEATH_FALL, 1);
      const dy = DEATH_DROP * tt * tt; // gravity-eased straight drop, no hop/spin
      // scaleY(-1) keeps the "knocked-over" dead pose (not a spin) while it falls.
      el.style.transform = `translate(${d.x}px, ${dy}px) scaleX(${d.dir}) scaleY(-1)`;
      el.style.opacity = tt < 1 ? "1" : "0"; // fall visibly, then stay hidden
      return;
    }
    el.style.transform = `translate(${x}px, ${y}px) scaleX(${dir})`;
    el.style.opacity = visible ? "1" : "0";
  };

  // Shoot a crab. Ignore an already-dead or currently-hidden one.
  const hitCrab = (idx: number) => {
    const d = dead.current[idx];
    if (d.hit) return;
    const el = idx === 0 ? soloRef.current : famRefs.current[idx - 1];
    if (!el || el.style.opacity === "0") return;
    d.hit = true;
    d.hitAt = performance.now();
    d.x = lastX.current[idx];
    d.dir = lastDir.current[idx];
    el.style.zIndex = "3"; // drop beneath the sand (z5) so it sinks out of view
  };

  // Clear a crab's death so it can walk again (called only when a fresh crossing
  // begins). Restores its z-index above the sand.
  const revive = (idx: number) => {
    const d = dead.current[idx];
    if (!d.hit) return;
    d.hit = false;
    const el = idx === 0 ? soloRef.current : famRefs.current[idx - 1];
    if (el) el.style.zIndex = "";
  };

  useEffect(() => {
    const el = soloRef.current;
    if (!el) return;
    const scene = el.parentElement;
    el.style.opacity = "1";

    // Tap/click to shoot. The crabs are `pointer-events-none` (the whole reef
    // sits at `-z-10` so element-level clicks don't reliably reach them — same
    // reason the octopus listens on the document). So hit-test a document-level
    // pointerdown against each live crab's box. Works on mouse + touch.
    const onPointerDown = (e: PointerEvent) => {
      for (let i = 0; i < CRAB_COUNT; i++) {
        const ce = i === 0 ? soloRef.current : famRefs.current[i - 1];
        if (!ce || dead.current[i].hit || ce.style.opacity === "0") continue;
        const r = ce.getBoundingClientRect();
        if (
          r.width > 0 &&
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          hitCrab(i);
          break; // one crab per tap
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });

    const frame = (now: number) => {
      if (!initRef.current) {
        initRef.current = true;
        lastRef.current = now;
        solo.current.dir = randDir();
        solo.current.phase = Math.random() * TAU;
        fam.current.dir = randDir();
        fam.current.phase = Math.random() * TAU;
        fam.current.waiting = true;
        fam.current.until = now + FAM_START_DELAY;
      }
      const dt = Math.min(now - lastRef.current, 50); // ms, clamped
      lastRef.current = now;
      const W = scene?.getBoundingClientRect().width || 1000;

      // Solo: continuous loop, variable pace; new direction + pace each lap.
      // When shot it drops, then waits a gap and RE-ENTERS as a fresh crossing
      // (from the edge) — never resuming the walk it was shot on.
      const so = solo.current;
      const d0 = dead.current[0];
      if (d0.hit) {
        if (now - d0.hitAt >= DEATH_FALL) {
          if (!so.waiting) {
            so.waiting = true;
            so.until = now + SOLO_RESPAWN_MIN + Math.random() * SOLO_RESPAWN_RAND;
          } else if (now >= so.until) {
            revive(0);
            so.waiting = false;
            so.prog = 0; // start the new walk from the screen edge
            so.dir = randDir();
            so.phase = Math.random() * TAU;
          }
        }
      } else {
        so.prog += (speedMul(now, so.phase) * dt) / SOLO_DUR;
        if (so.prog >= 1) {
          so.prog -= 1;
          so.dir = randDir();
          so.phase = Math.random() * TAU;
        }
      }
      const sgw = SOLO_SIZE + 60;
      const sx = so.dir === 1 ? -sgw + (W + sgw * 2) * so.prog : W + sgw - (W + sgw * 2) * so.prog;
      render(el, 0, sx, Math.sin(now / 280) * 4, so.dir, true, now);

      // Family: periodic crossings (variable pace), hidden during the gap.
      const f = fam.current;
      const fgw = FAMILY[0].size + 260;
      let visible = !f.waiting;
      let fx = -fgw;
      if (f.waiting) {
        if (now >= f.until) {
          f.waiting = false;
          f.prog = 0;
          f.dir = randDir();
          f.phase = Math.random() * TAU;
          visible = true;
          // A new stroll — any members shot last crossing rejoin it.
          revive(1);
          revive(2);
          revive(3);
        }
      } else {
        f.prog += (speedMul(now, f.phase) * dt) / FAM_DUR;
        if (f.prog >= 1) {
          f.waiting = true;
          f.until = now + FAM_GAP_MIN + Math.random() * FAM_GAP_RAND;
          visible = false;
        } else {
          fx = f.dir === 1 ? -fgw + (W + fgw * 2) * f.prog : W + fgw - (W + fgw * 2) * f.prog;
        }
      }
      const fd = f.dir;
      FAMILY.forEach((m, i) => {
        const fe = famRefs.current[i];
        if (!fe) return;
        // Trailing offset flips with direction so the little ones follow behind.
        render(fe, i + 1, fx + m.dx * fd, Math.sin(now / 280 + m.phase) * 4, fd, visible, now);
      });

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={soloRef}
        src="/underwater/crab.gif"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute bottom-[24px] sm:bottom-[44px] left-0 z-[6]"
        style={{ width: SOLO_SIZE, height: "auto", imageRendering: "pixelated", opacity: 0, willChange: "transform, opacity" }}
      />
      {FAMILY.map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          ref={(el) => {
            famRefs.current[i] = el;
          }}
          src="/underwater/crab.gif"
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute bottom-[24px] sm:bottom-[44px] left-0 z-[6]"
          style={{ width: m.size, height: "auto", imageRendering: "pixelated", opacity: 0, willChange: "transform, opacity" }}
        />
      ))}
    </>
  );
}
