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
  const solo = useRef({ prog: 0, dir: 1 as 1 | -1, phase: 0 });
  const fam = useRef({ prog: 0, dir: 1 as 1 | -1, phase: 0, waiting: true, until: 0 });

  useEffect(() => {
    const el = soloRef.current;
    if (!el) return;
    const scene = el.parentElement;
    el.style.opacity = "1";

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
      const so = solo.current;
      so.prog += (speedMul(now, so.phase) * dt) / SOLO_DUR;
      if (so.prog >= 1) {
        so.prog -= 1;
        so.dir = randDir();
        so.phase = Math.random() * TAU;
      }
      const sgw = SOLO_SIZE + 60;
      const sx = so.dir === 1 ? -sgw + (W + sgw * 2) * so.prog : W + sgw - (W + sgw * 2) * so.prog;
      el.style.transform = `translate(${sx}px, ${Math.sin(now / 280) * 4}px) scaleX(${so.dir})`;

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
        fe.style.transform = `translate(${fx + m.dx * fd}px, ${Math.sin(now / 280 + m.phase) * 4}px) scaleX(${fd})`;
        fe.style.opacity = visible ? "1" : "0";
      });

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
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
        className="pointer-events-none absolute bottom-[44px] left-0 z-[6]"
        style={{ width: SOLO_SIZE, height: "auto", imageRendering: "pixelated", opacity: 0, willChange: "transform" }}
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
          className="pointer-events-none absolute bottom-[44px] left-0 z-[6]"
          style={{ width: m.size, height: "auto", imageRendering: "pixelated", opacity: 0, willChange: "transform" }}
        />
      ))}
    </>
  );
}
