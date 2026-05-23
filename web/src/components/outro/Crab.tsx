"use client";

import { useEffect, useRef } from "react";

// A little family: a big leader with two smaller ones trailing behind.
const FAMILY = [
  { size: 80, dx: 0, bob: 0 },
  { size: 50, dx: -66, bob: 0.45 },
  { size: 44, dx: -120, bob: 0.95 },
];

/**
 * A crab family that occasionally strolls left → right along the sand (behind
 * the front kelp). The group translates across; each crab bobs as it walks.
 */
export function Crab() {
  const groupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const st = useRef({ active: false, t0: 0, dur: 16000, nextAt: 0, init: false });

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const scene = group.parentElement;

    const frame = (now: number) => {
      const rect = scene?.getBoundingClientRect();
      const W = rect?.width || 1000;
      const s = st.current;

      if (!s.init) {
        s.init = true;
        s.nextAt = now + 3000 + Math.random() * 5000;
        group.style.opacity = "1";
      }
      if (!s.active && now >= s.nextAt) {
        s.active = true;
        s.t0 = now;
        s.dur = 15000 + Math.random() * 9000; // 15–24s slow stroll
      }

      if (s.active) {
        const p = (now - s.t0) / s.dur;
        if (p >= 1) {
          s.active = false;
          s.nextAt = now + 14000 + Math.random() * 18000; // gap before the next stroll
          group.style.transform = "translateX(-9999px)";
        } else {
          const gw = 240;
          const x = -gw + (W + gw * 2) * p; // off-left → off-right
          group.style.transform = `translateX(${x}px)`;
        }
      } else {
        group.style.transform = "translateX(-9999px)";
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      ref={groupRef}
      aria-hidden
      className="pointer-events-none absolute bottom-[14px] left-0 z-[6]"
      style={{ opacity: 0, willChange: "transform" }}
    >
      {FAMILY.map((c, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src="/underwater/crab.gif"
          alt=""
          draggable={false}
          className="absolute bottom-0"
          style={{
            left: c.dx,
            width: c.size,
            height: "auto",
            imageRendering: "pixelated",
            animation: `crab-bob 0.6s ease-in-out ${c.bob}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
