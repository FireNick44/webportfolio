"use client";

import type { CSSProperties } from "react";
import { generateKelp } from "@/lib/outro/kelp";

const STRANDS = generateKelp(11, 6);

export function Kelp({ animated }: { animated: boolean }) {
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 z-[3] h-[42%]">
      {STRANDS.map((s) => (
        <div
          key={s.id}
          className="absolute bottom-0 flex flex-col-reverse items-center"
          style={{ left: `${s.leftPct}%`, width: s.widthPx }}
        >
          {s.segments.map((grid, i) => {
            const style: CSSProperties = {
              transformOrigin: "bottom center",
              display: "grid",
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
      ))}
    </div>
  );
}
