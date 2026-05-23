"use client";

import { useEffect, useRef } from "react";

const SOLO_SIZE = 140;
const SOLO_DUR = 16000; // ms for one crossing (loops continuously)

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

const randDir = (): 1 | -1 => (Math.random() < 0.5 ? 1 : -1);

/**
 * Two independent crab events, each animated as a directly-transformed <img>
 * (the approach that actually renders). Each pass picks a random direction and
 * flips the sprite (scaleX) to face the way it's walking:
 *  - a solo crab looping continuously across the sand;
 *  - a separate family (lead + two trailing) that strolls by periodically.
 */
export function Crab() {
  const soloRef = useRef<HTMLImageElement>(null);
  const famRefs = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef(0);
  const t0 = useRef(0);
  const solo = useRef<{ lastP: number; dir: 1 | -1 }>({ lastP: 0, dir: 1 });
  const fam = useRef<{ startAt: number; dur: number; dir: 1 | -1 }>({
    startAt: 0,
    dur: FAM_DUR,
    dir: 1,
  });

  useEffect(() => {
    const el = soloRef.current;
    if (!el) return;
    const scene = el.parentElement;
    el.style.opacity = "1";

    const frame = (now: number) => {
      if (!t0.current) {
        t0.current = now;
        fam.current.startAt = now + FAM_START_DELAY;
        solo.current.dir = randDir();
        fam.current.dir = randDir();
      }
      const W = scene?.getBoundingClientRect().width || 1000;

      // Solo: continuous loop; new random direction each lap.
      const sgw = SOLO_SIZE + 60;
      const sp = ((now - t0.current) % SOLO_DUR) / SOLO_DUR;
      if (sp < solo.current.lastP) solo.current.dir = randDir(); // wrapped → new lap
      solo.current.lastP = sp;
      const sd = solo.current.dir;
      const sx = sd === 1 ? -sgw + (W + sgw * 2) * sp : W + sgw - (W + sgw * 2) * sp;
      el.style.transform = `translate(${sx}px, ${Math.sin(now / 280) * 4}px) scaleX(${sd})`;

      // Family: periodic crossings, hidden off-screen during the gap between.
      const fgw = FAMILY[0].size + 260;
      const f = fam.current;
      const elapsed = now - f.startAt;
      let visible = elapsed >= 0;
      let fx = -fgw;
      if (elapsed >= 0) {
        const fp = elapsed / f.dur;
        if (fp >= 1) {
          f.startAt = now + FAM_GAP_MIN + Math.random() * FAM_GAP_RAND;
          f.dur = FAM_DUR;
          f.dir = randDir();
          visible = false;
        } else {
          fx = f.dir === 1 ? -fgw + (W + fgw * 2) * fp : W + fgw - (W + fgw * 2) * fp;
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
