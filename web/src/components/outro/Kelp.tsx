"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { generateKelp } from "@/lib/outro/kelp";
import type { PointerField } from "@/hooks/usePointerField";

const REACT_R = 150; // px — how near the cursor disturbs a strand
const MAX_LEAN = 14; // deg — how far it bends away

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

  // High tier: strands near the cursor bend away (the "water" is disturbed).
  useEffect(() => {
    if (!reactive || !pointer) return;
    const cont = containerRef.current;
    if (!cont) return;
    const tick = () => {
      const p = pointer.current;
      const W = cont.clientWidth || 1;
      const cx = p && p.active ? p.x : -99999;
      for (let i = 0; i < wrapRefs.current.length; i++) {
        const el = wrapRefs.current[i];
        if (!el) continue;
        const sx = (lefts[i] / 100) * W;
        const d = Math.abs(cx - sx);
        const lean = d < REACT_R ? (1 - d / REACT_R) * MAX_LEAN * (cx > sx ? -1 : 1) : 0;
        el.style.transform = lean ? `rotate(${lean}deg)` : "";
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reactive, pointer, lefts]);

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
