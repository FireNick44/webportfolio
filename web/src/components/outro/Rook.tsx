"use client";

import { useEffect, useRef } from "react";

/**
 * A big creature that occasionally cruises across the scene — left→right or
 * right→left at random, flipped to face the way it's swimming — on a randomized,
 * undulating path (different height, bob, speed each pass), with long gaps
 * (~5–10 min) so it's a rare treat.
 */
export function Rook() {
  const elRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef(0);
  const st = useRef({
    active: false,
    t0: 0,
    dur: 6000,
    baseY: 0,
    bobAmp: 0,
    bobCycles: 2,
    nextAt: 0,
    init: false,
    dir: 1 as 1 | -1,
  });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const scene = el.parentElement;

    const begin = (now: number, H: number) => {
      const s = st.current;
      s.active = true;
      s.t0 = now;
      s.dur = 4500 + Math.random() * 3000; // 4.5–7.5s crossing
      s.baseY = H * (0.22 + Math.random() * 0.42); // random height per pass
      s.bobAmp = 24 + Math.random() * 48; // vertical wander
      s.bobCycles = 1.4 + Math.random() * 1.6; // a couple of up/downs across
      s.dir = Math.random() < 0.5 ? 1 : -1; // L→R or R→L
    };

    const frame = (now: number) => {
      const rect = scene?.getBoundingClientRect();
      const W = rect?.width || 1000;
      const H = rect?.height || 800;
      const s = st.current;

      if (!s.init) {
        s.init = true;
        s.nextAt = now + 60000 + Math.random() * 60000; // first pass after ~1–2 min
        el.style.opacity = "1";
      }
      if (!s.active && now >= s.nextAt) begin(now, H);

      if (s.active) {
        const p = (now - s.t0) / s.dur;
        if (p >= 1) {
          s.active = false;
          s.nextAt = now + 300000 + Math.random() * 300000; // rare: once every ~5–10 min
          el.style.transform = "translate(-99999px,0)";
        } else {
          const ww = el.offsetWidth || 240;
          const span = W + ww * 2 + 120;
          // dir=1: off-left → off-right; dir=-1: off-right → off-left.
          const x = s.dir === 1 ? -ww - 60 + span * p : W + ww + 60 - span * p;
          const y = s.baseY + Math.sin(p * Math.PI * 2 * s.bobCycles) * s.bobAmp;
          // gif faces left natively; scaleX(-1) faces right. Face travel direction:
          el.style.transform = `translate(${x}px, ${y}px) scaleX(${-s.dir})`;
        }
      } else {
        el.style.transform = "translate(-99999px,0)"; // parked off-screen
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={elRef}
      src="/underwater/rook.gif"
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute left-0 top-0 z-[3]"
      style={{ width: "clamp(300px, 38vw, 540px)", opacity: 0, willChange: "transform" }}
    />
  );
}
