"use client";

import { useEffect, useRef, useState } from "react";

// The crab content is only the bottom-center ~56%×40% of the gif frame, so the
// widths are sized up to compensate.
type CrabSpec = { size: number; dx: number; bob: number };
const BIG: CrabSpec = { size: 132, dx: 0, bob: 0 };
const SMALLS: CrabSpec[] = [
  { size: 86, dx: -98, bob: 0.45 },
  { size: 76, dx: -170, bob: 0.95 },
];

/**
 * A crab that frequently strolls left → right along the sand (behind the front
 * kelp). Most strolls are a single crab; occasionally (rare) it's a whole
 * family — the big one with two smaller ones trailing behind.
 */
export function Crab() {
  const [family, setFamily] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const st = useRef({ active: false, t0: 0, dur: 0, nextAt: 0, init: false });

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
        s.nextAt = now + 1200 + Math.random() * 2500;
        group.style.opacity = "1";
      }
      if (!s.active && now >= s.nextAt) {
        s.active = true;
        s.t0 = now;
        s.dur = 14000 + Math.random() * 8000; // 14–22s stroll
        setFamily(Math.random() < 0.15); // family is the rare variant
      }

      if (s.active) {
        const p = (now - s.t0) / s.dur;
        if (p >= 1) {
          s.active = false;
          s.nextAt = now + 2500 + Math.random() * 4500; // short gap → a crab is around a lot
          group.style.transform = "translateX(-9999px)";
        } else {
          const gw = 280;
          group.style.transform = `translateX(${-gw + (W + gw * 2) * p}px)`;
        }
      } else {
        group.style.transform = "translateX(-9999px)";
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const crab = (c: CrabSpec, key: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={key}
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
  );

  return (
    <div
      ref={groupRef}
      aria-hidden
      className="pointer-events-none absolute bottom-[14px] left-0 z-[6]"
      style={{ opacity: 0, willChange: "transform" }}
    >
      {crab(BIG, 0)}
      {family && SMALLS.map((c, i) => crab(c, i + 1))}
    </div>
  );
}
