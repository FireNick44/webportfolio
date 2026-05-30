"use client";

import { useEffect, useRef } from "react";

import { generateSand } from "@/lib/outro/sand";

const CELL = 14; // px — square pixel size (1:1, never stretched)

// Wavy top edge so the sand reads as a dune. Deeper multi-peak curve to match
// the WaveDivider's rhythm — static (no animation, per spec). ViewBox 120×28;
// curve oscillates between y≈2 and y≈18 (16-unit amplitude) across 3 full
// waves before closing to the bottom rectangle.
const WAVE_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 28' preserveAspectRatio='none'%3E%3Cpath d='M0,10 C12,2 24,18 36,10 C48,2 60,18 72,10 C84,2 96,18 108,10 C114,6 117,10 120,10 L120,28 L0,28 Z' fill='%23000'/%3E%3C/svg%3E\")";

export function SandFloor({
  rows = 6,
  className = "absolute inset-x-0 bottom-0 z-[2]",
}: {
  /** Number of pixel rows → band height (rows × CELL). */
  rows?: number;
  /** Override container (z-index, etc.). */
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = rows * CELL;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Columns fill the width with square CELL×CELL pixels — no stretching.
      const cols = Math.ceil(w / CELL) + 1;
      const grid = generateSand(23, cols, rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = grid[r][c];
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [rows]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{
        height: rows * CELL,
        width: "100%",
        WebkitMaskImage: WAVE_MASK,
        maskImage: WAVE_MASK,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    />
  );
}
