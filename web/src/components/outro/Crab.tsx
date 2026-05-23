"use client";

import { useEffect, useRef } from "react";

const SOLO_SIZE = 140;
const SOLO_DUR = 16000; // ms for one left → right crossing (loops continuously)

// Family: lead crab + two trailing little ones (size, x-offset from lead, bob phase).
const FAMILY = [
  { size: 140, dx: 0, phase: 0 },
  { size: 96, dx: -120, phase: 0.7 },
  { size: 82, dx: -212, phase: 1.4 },
];
const FAM_DUR = 18000; // one crossing
const FAM_GAP_MIN = 14000;
const FAM_GAP_RAND = 12000;
const FAM_START_DELAY = 3000;

/**
 * Two independent crab events, each animated as a directly-transformed <img>
 * (the approach that actually renders):
 *  - a solo crab looping continuously across the sand;
 *  - a separate family (lead + two trailing) that strolls by periodically.
 */
export function Crab() {
  const soloRef = useRef<HTMLImageElement>(null);
  const famRefs = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef(0);
  const t0 = useRef(0);
  const fam = useRef({ startAt: 0, dur: FAM_DUR });

  useEffect(() => {
    const solo = soloRef.current;
    if (!solo) return;
    const scene = solo.parentElement;
    solo.style.opacity = "1";

    const frame = (now: number) => {
      if (!t0.current) {
        t0.current = now;
        fam.current.startAt = now + FAM_START_DELAY;
      }
      const W = scene?.getBoundingClientRect().width || 1000;

      // Solo: continuous loop.
      const sgw = SOLO_SIZE + 60;
      const sp = ((now - t0.current) % SOLO_DUR) / SOLO_DUR;
      const sx = -sgw + (W + sgw * 2) * sp;
      solo.style.transform = `translate(${sx}px, ${Math.sin(now / 280) * 4}px)`;

      // Family: periodic crossings, hidden off-screen during the gap between.
      const fgw = FAMILY[0].size + 260;
      const f = fam.current;
      const elapsed = now - f.startAt;
      let visible = elapsed >= 0;
      let fx = -fgw;
      if (elapsed >= 0) {
        const p = elapsed / f.dur;
        if (p >= 1) {
          f.startAt = now + FAM_GAP_MIN + Math.random() * FAM_GAP_RAND;
          f.dur = FAM_DUR;
          visible = false;
        } else {
          fx = -fgw + (W + fgw * 2) * p;
        }
      }
      FAMILY.forEach((m, i) => {
        const el = famRefs.current[i];
        if (!el) return;
        el.style.transform = `translate(${fx + m.dx}px, ${Math.sin(now / 280 + m.phase) * 4}px)`;
        el.style.opacity = visible ? "1" : "0";
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
        className="pointer-events-none absolute bottom-[10px] left-0 z-[6]"
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
          className="pointer-events-none absolute bottom-[10px] left-0 z-[6]"
          style={{ width: m.size, height: "auto", imageRendering: "pixelated", opacity: 0, willChange: "transform" }}
        />
      ))}
    </>
  );
}
