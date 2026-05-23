"use client";

import type { CSSProperties } from "react";

/** A coral planted on the sand floor (transparent PNG), with a gentle sway. */
export function Coral({
  src,
  leftPct,
  widthPx,
  flip = false,
  delay = 0,
}: {
  src: string;
  leftPct: number;
  widthPx: number;
  flip?: boolean;
  delay?: number;
}) {
  const wrap: CSSProperties = {
    left: `${leftPct}%`,
    width: widthPx,
    transformOrigin: "bottom center",
    animation: `coral-sway 7s ease-in-out ${delay}s infinite`,
  };
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-0 z-[5]" style={wrap}>
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
