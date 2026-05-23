"use client";

import type { CSSProperties } from "react";

/** A coral planted on the sand floor (transparent PNG), with a gentle sway. */
export function Coral({
  src,
  leftPct,
  widthPx,
  flip = false,
  delay = 0,
  animated = true,
  bottomPx = 0,
  z = 5,
}: {
  src: string;
  leftPct: number;
  widthPx: number;
  flip?: boolean;
  delay?: number;
  animated?: boolean;
  bottomPx?: number;
  z?: number;
}) {
  const wrap: CSSProperties = {
    left: `${leftPct}%`,
    bottom: bottomPx,
    width: widthPx,
    zIndex: z,
    transformOrigin: "bottom center",
    animation: animated ? `coral-sway 7s ease-in-out ${delay}s infinite` : "none",
  };
  return (
    <div aria-hidden className="pointer-events-none absolute" style={wrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: "100%", display: "block", transform: flip ? "scaleX(-1)" : undefined }}
      />
    </div>
  );
}
