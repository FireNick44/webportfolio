"use client";

import { useEffect, useRef, useState } from "react";

// The crab content is the bottom-center ~56%×40% of the gif, so sizes are bumped.
type CrabSpec = { size: number; dx: number; bob: number };
const BIG: CrabSpec = { size: 190, dx: 0, bob: 0 };
const SMALLS: CrabSpec[] = [
  { size: 122, dx: -140, bob: 0.45 },
  { size: 108, dx: -244, bob: 0.95 },
];

// TEMP (visibility test): raised into the water so it's easy to spot.
// Set to "14px" to plant the family back on the sand.
const WALK_BOTTOM = "38%";

/**
 * A crab that frequently strolls left → right. Most strolls are a single crab;
 * occasionally (rare) it's a family — the big one with two smaller ones trailing.
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
        s.nextAt = now + 300; // appear almost immediately
        group.style.opacity = "1";
      }
      if (!s.active && now >= s.nextAt) {
        s.active = true;
        s.t0 = now;
        s.dur = 14000 + Math.random() * 8000;
        setFamily(Math.random() < 0.15);
      }

      if (s.active) {
        const p = (now - s.t0) / s.dur;
        if (p >= 1) {
          s.active = false;
          s.nextAt = now + 800 + Math.random() * 1500; // near-continuous → almost always around
          group.style.transform = "translateX(-9999px)";
        } else {
          const gw = 340;
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
      className="pointer-events-none absolute left-0 z-[6]"
      style={{ bottom: WALK_BOTTOM, opacity: 0, willChange: "transform" }}
    >
      {crab(BIG, 0)}
      {family && SMALLS.map((c, i) => crab(c, i + 1))}
    </div>
  );
}
