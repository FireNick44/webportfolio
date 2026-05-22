"use client";

import { generateSand } from "@/lib/outro/sand";

const COLS = 64;
const CELL_H = 16; // px — fixed so the band height never scales with viewport width

// Wavy top edge so the sand reads as a dune, not a hard rectangular cut-off.
const WAVE_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 28' preserveAspectRatio='none'%3E%3Cpath d='M0,12C22,4,38,16,60,11C82,6,98,16,120,11L120,28L0,28Z' fill='%23000'/%3E%3C/svg%3E\")";

export function SandFloor({
  rows = 6,
  className = "absolute inset-x-0 bottom-0 z-[2]",
}: {
  /** Number of pixel rows → controls band height (rows × 16px). */
  rows?: number;
  /** Override container (z-index, etc.). */
  className?: string;
}) {
  const sand = generateSand(23, COLS, rows);
  return (
    <div
      aria-hidden
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridAutoRows: `${CELL_H}px`,
        imageRendering: "pixelated",
        WebkitMaskImage: WAVE_MASK,
        maskImage: WAVE_MASK,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    >
      {sand.flat().map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </div>
  );
}
