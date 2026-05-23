"use client";

import { useEffect, useRef } from "react";

const SIZE = 140;
const DUR = 16000; // ms for one left → right crossing (loops continuously)

/** A single crab walking continuously left → right along the sand. */
export function Crab() {
  const ref = useRef<HTMLImageElement>(null);
  const rafRef = useRef(0);
  const t0 = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scene = el.parentElement;
    el.style.opacity = "1";

    const frame = (now: number) => {
      if (!t0.current) t0.current = now;
      const rect = scene?.getBoundingClientRect();
      const W = rect?.width || 1000;
      const gw = SIZE + 60;
      const p = ((now - t0.current) % DUR) / DUR; // 0..1, looping
      const x = -gw + (W + gw * 2) * p;
      const bob = Math.sin(now / 280) * 4; // little walking hop
      el.style.transform = `translate(${x}px, ${bob}px)`;
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/underwater/crab.gif"
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute bottom-[10px] left-0 z-[6]"
      style={{ width: SIZE, height: "auto", imageRendering: "pixelated", opacity: 0, willChange: "transform" }}
    />
  );
}
