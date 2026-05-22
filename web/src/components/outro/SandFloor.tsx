"use client";

import { generateSand } from "@/lib/outro/sand";

const COLS = 56;
const ROWS = 5;
const SAND = generateSand(23, COLS, ROWS);

export function SandFloor() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 z-[2]"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        imageRendering: "pixelated",
      }}
    >
      {SAND.flat().map((c, i) => (
        <span key={i} style={{ background: c, width: "100%", paddingBottom: "100%" }} />
      ))}
    </div>
  );
}
