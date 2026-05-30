import { mulberry32 } from "@/lib/physics/generateFlasks";

const GREENS = ["#1f6b3a", "#2f8a4d", "#3fa861", "#176030"];

/** Every solid color a kelp cell can take (empty cells are "transparent"). */
export const KELP_PALETTE = GREENS;

export interface KelpStrand {
  id: number;
  /** Horizontal position across the floor, 0..100 (%). */
  leftPct: number;
  /** Rendered strand width in px. */
  widthPx: number;
  /** Pixel columns per segment. */
  cols: number;
  /** Max sway angle in degrees (± this). */
  swayDeg: number;
  /** Sway period in seconds. */
  swayDurS: number;
  /** Per-strand size multiplier — varies height/width for a denser, layered bed. */
  scale: number;
  /** Bottom→top list of segments; each segment is a rows × cols hex grid. */
  segments: string[][][];
}

export function generateKelp(seed: number, count: number): KelpStrand[] {
  const rng = mulberry32(seed);
  const strands: KelpStrand[] = [];
  for (let i = 0; i < count; i++) {
    const cols = 2;
    const segCount = 3 + Math.floor(rng() * 2); // 3–4
    const rows = 4 + Math.floor(rng() * 2); // 4–5
    const segments: string[][][] = [];
    for (let s = 0; s < segCount; s++) {
      const grid: string[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < cols; c++) {
          const edge = (c === 0 || c === cols - 1) && rng() < 0.2;
          row.push(edge ? "transparent" : GREENS[Math.floor(rng() * GREENS.length)]);
        }
        grid.push(row);
      }
      segments.push(grid);
    }
    strands.push({
      id: i,
      leftPct: 6 + rng() * 88,
      widthPx: 12 + Math.floor(rng() * 8),
      cols,
      swayDeg: 3 + rng() * 4,
      swayDurS: 4 + rng() * 3,
      scale: 0.6 + rng() * 0.9,
      segments,
    });
  }
  return strands;
}
