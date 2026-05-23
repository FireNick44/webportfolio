"use client";

import { useEffect, useRef } from "react";

/**
 * A big creature that occasionally cruises LEFT → RIGHT (flipped to face that
 * way) on a randomized, undulating path — different height, bob and speed each
 * pass, with long random gaps so it's a rare event.
 */
export function Rook() {
  const elRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef(0);
  const st = useRef({
    active: false,
    t0: 0,
    dur: 12000,
    baseY: 0,
    bobAmp: 0,
    bobCycles: 2,
    nextAt: 0,
    init: false,
  });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const scene = el.parentElement;

    const begin = (now: number, H: number) => {
      const s = st.current;
      s.active = true;
      s.t0 = now;
      s.dur = 5500 + Math.random() * 4000; // 5.5–9.5s crossing (faster)
      s.baseY = H * (0.22 + Math.random() * 0.42); // random height per pass
      s.bobAmp = 24 + Math.random() * 48; // vertical wander
      s.bobCycles = 1.4 + Math.random() * 1.6; // a couple of up/downs across
    };

    const frame = (now: number) => {
      const rect = scene?.getBoundingClientRect();
      const W = rect?.width || 1000;
      const H = rect?.height || 800;
      const s = st.current;

      if (!s.init) {
        s.init = true;
        s.nextAt = now + 6000 + Math.random() * 9000;
        el.style.opacity = "1";
      }
      if (!s.active && now >= s.nextAt) begin(now, H);

      if (s.active) {
        const p = (now - s.t0) / s.dur;
        if (p >= 1) {
          s.active = false;
          s.nextAt = now + 30000 + Math.random() * 45000; // long random gap (rare: ~30–75s)
          el.style.transform = "translate(-99999px,0)";
        } else {
          const ww = el.offsetWidth || 240;
          const x = -ww - 60 + (W + ww * 2 + 120) * p; // off-left → off-right
          const y = s.baseY + Math.sin(p * Math.PI * 2 * s.bobCycles) * s.bobAmp;
          // scaleX(-1) flips it to face the direction it's swimming (rightward).
          el.style.transform = `translate(${x}px, ${y}px) scaleX(-1)`;
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
      className="pointer-events-none absolute left-0 top-0 z-[2]"
      style={{ width: "clamp(300px, 38vw, 540px)", opacity: 0, willChange: "transform" }}
    />
  );
}
