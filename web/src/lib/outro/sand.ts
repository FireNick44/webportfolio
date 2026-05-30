import { mulberry32 } from "@/lib/utils/mulberry32";

const SAND_TONES = ["#d9c08a", "#d2b87f", "#c9ad72", "#e0caa0"];
const PEBBLE = "#a98f5f";

/** Every color a sand cell can take (tones + the occasional pebble). */
export const SAND_PALETTE = [...SAND_TONES, PEBBLE];

/** Returns a rows × cols grid of hex colors for the pixel-art sea floor. */
export function generateSand(seed: number, cols: number, rows: number): string[][] {
  const rng = mulberry32(seed);
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(rng() < 0.06 ? PEBBLE : SAND_TONES[Math.floor(rng() * SAND_TONES.length)]);
    }
    grid.push(row);
  }
  return grid;
}
