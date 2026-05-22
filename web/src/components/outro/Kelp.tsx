"use client";

import { useMemo, type CSSProperties } from "react";
import { generateKelp } from "@/lib/outro/kelp";

export function Kelp({
  animated,
  clusterAround,
  seed = 11,
  count = 12,
  scaleMul = 1,
  className = "absolute inset-x-0 bottom-0 z-[3] h-[42%]",
}: {
  animated: boolean;
  /** If set (0–100), pull strands toward this % to form one dense patch. */
  clusterAround?: number;
  /** RNG seed — use a different one for a visually distinct second layer. */
  seed?: number;
  /** Number of strands. */
  count?: number;
  /** Extra size multiplier (e.g. a larger foreground layer). */
  scaleMul?: number;
  /** Override the container (z-index, height, filters). */
  className?: string;
}) {
  const strands = useMemo(() => generateKelp(seed, count), [seed, count]);

  return (
    <div aria-hidden className={className}>
      {strands.map((s) => {
        const leftPct =
          clusterAround == null ? s.leftPct : clusterAround + (s.leftPct - 50) * 0.3;
        return (
          <div
            key={s.id}
            className="absolute bottom-0 flex flex-col-reverse items-center"
            style={{ left: `${leftPct}%`, width: s.widthPx * s.scale * scaleMul }}
          >
            {s.segments.map((grid, i) => {
              const style: CSSProperties = {
                transformOrigin: "bottom center",
                display: "grid",
                // Without a definite width the 1fr tracks + %-sized empty cells
                // collapse to 0; the strand wrapper supplies the px width.
                width: "100%",
                gridTemplateColumns: `repeat(${s.cols}, 1fr)`,
                imageRendering: "pixelated",
                animation: animated
                  ? `kelp-sway ${s.swayDurS}s ease-in-out ${
                      (i * s.swayDurS) / (s.segments.length * 2)
                    }s infinite`
                  : "none",
                // CSS custom props for the keyframes (typed loosely on purpose).
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
        );
      })}
    </div>
  );
}
