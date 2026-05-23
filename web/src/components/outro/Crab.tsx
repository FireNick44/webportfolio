"use client";

import { useEffect, useRef, useState } from "react";

type Spec = { size: number; dx: number; bob: number };
const BIG: Spec = { size: 140, dx: 0, bob: 0 };
const SMALLS: Spec[] = [
  { size: 92, dx: -118, bob: 0.2 },
  { size: 80, dx: -208, bob: 0.4 },
];

/**
 * A crab strolling left → right along the sand, near-continuously. Most passes
 * are a single crab; some are a family (big + two trailing). The first pass is
 * a family so it's easy to confirm.
 */
export function Crab() {
  const [family, setFamily] = useState(true);
  const groupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const st = useRef({ t0: 0, dur: 16000, init: false, first: true });

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const scene = group.parentElement;

    const startPass = (now: number) => {
      st.current.t0 = now;
      st.current.dur = 14000 + Math.random() * 8000;
      setFamily(st.current.first ? true : Math.random() < 0.25);
      st.current.first = false;
    };

    const frame = (now: number) => {
      const s = st.current;
      if (!s.init) {
        s.init = true;
        startPass(now);
      }
      const rect = scene?.getBoundingClientRect();
      const W = rect?.width || 1000;
      const gw = 260;
      let p = (now - s.t0) / s.dur;
      if (p >= 1) {
        startPass(now);
        p = 0;
      }
      group.style.transform = `translateX(${-gw + (W + gw * 2) * p}px)`;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const crab = (c: Spec, key: number) => (
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
        animation: `crab-bob 0.55s ease-in-out ${c.bob}s infinite`,
      }}
    />
  );

  return (
    <div
      ref={groupRef}
      aria-hidden
      className="pointer-events-none absolute bottom-[10px] left-0 z-[6]"
      style={{ opacity: 1, willChange: "transform" }}
    >
      {crab(BIG, 0)}
      {family && SMALLS.map((c, i) => crab(c, i + 1))}
    </div>
  );
}
