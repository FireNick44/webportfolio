"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type RefObject } from "react";

import type { PointerField } from "@/hooks/usePointerField";
import { generateKelp } from "@/lib/outro/kelp";

const FALLOFF = 95; // px — smooth ramp zone around a strand's box
const AMP_DEG = 3.5; // deg — slight (no left↔right flip)
const WAVE_MS = 700; // gentle oscillation period
const EASE = 0.08; // per-frame easing so it ramps in/out, never snaps

export function Kelp({
  animated,
  clusterAround,
  seed = 11,
  count = 12,
  scaleMul = 1,
  className = "absolute inset-x-0 bottom-0 z-[3] h-[42%]",
  pointer,
  reactive = false,
}: {
  animated: boolean;
  /** If set (0–100), pull strands toward this % to form one dense patch. */
  clusterAround?: number;
  seed?: number;
  count?: number;
  scaleMul?: number;
  className?: string;
  /** Cursor field — strands bend away from it when `reactive`. */
  pointer?: RefObject<PointerField | null>;
  reactive?: boolean;
}) {
  const strands = useMemo(() => generateKelp(seed, count), [seed, count]);
  const lefts = useMemo(
    () =>
      strands.map((s) =>
        clusterAround == null ? s.leftPct : clusterAround + (s.leftPct - 50) * 0.3,
      ),
    [strands, clusterAround],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef(0);
  const ampRef = useRef<number[]>([]);

  // High tier: strands near the cursor sway a touch more — a gentle wave that
  // eases in as the cursor nears and eases out as it leaves (never snaps).
  useEffect(() => {
    if (!reactive || !pointer) return;
    const cont = containerRef.current;
    if (!cont) return;
    const tick = (now: number) => {
      const p = pointer.current;
      const cr = cont.getBoundingClientRect();
      const active = !!p && p.active;
      // Cursor in container-local coords (offset* boxes below are also local).
      const cx = active ? p.clientX - cr.left : -99999;
      const cy = active ? p.clientY - cr.top : -99999;
      for (let i = 0; i < wrapRefs.current.length; i++) {
        const el = wrapRefs.current[i];
        if (!el) continue;
        const x0 = el.offsetLeft;
        const x1 = x0 + el.offsetWidth;
        const y0 = el.offsetTop;
        const y1 = y0 + el.offsetHeight;
        // Distance from the cursor to the strand's box (0 if inside).
        const dx = Math.max(x0 - cx, 0, cx - x1);
        const dy = Math.max(y0 - cy, 0, cy - y1);
        const distBox = Math.hypot(dx, dy);
        const targetAmp = active && distBox < FALLOFF ? 1 - distBox / FALLOFF : 0;
        const prev = ampRef.current[i] ?? 0;
        const amp = prev + (targetAmp - prev) * EASE; // smooth ramp in/out
        ampRef.current[i] = amp;
        el.style.transform =
          amp > 0.003 ? `rotate(${amp * AMP_DEG * Math.sin(now / WAVE_MS + i * 0.6)}deg)` : "";
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reactive, pointer]);

  return (
    <div ref={containerRef} aria-hidden className={className}>
      {strands.map((s, idx) => (
        <div
          key={s.id}
          ref={(el) => {
            wrapRefs.current[idx] = el;
          }}
          className="absolute bottom-0 flex flex-col-reverse items-center"
          style={{
            left: `${lefts[idx]}%`,
            width: s.widthPx * s.scale * scaleMul,
            transformOrigin: "bottom center",
          }}
        >
          {s.segments.map((grid, i) => {
            const style: CSSProperties = {
              transformOrigin: "bottom center",
              display: "grid",
              width: "100%",
              gridTemplateColumns: `repeat(${s.cols}, 1fr)`,
              imageRendering: "pixelated",
              animation: animated
                ? `kelp-sway ${s.swayDurS}s ease-in-out ${
                    (i * s.swayDurS) / (s.segments.length * 2)
                  }s infinite`
                : "none",
              ["--kelp-from" as keyof CSSProperties as string]: `${-s.swayDeg}deg`,
              ["--kelp-to" as keyof CSSProperties as string]: `${s.swayDeg}deg`,
            };
            return (
              <div key={i} style={style}>
                {grid.flat().map((c, j) => (
                  <span key={j} style={{ background: c, width: "100%", paddingBottom: "100%" }} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
