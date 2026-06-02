import { describe, expect, it } from "vitest";

import { contrastRatio, hexToRgb } from "./colorUtils";
import { randomTheme } from "./randomTheme";

/** HSL saturation (0..1) of a hex colour — used to prove the generated theme is
 *  actually *coloured* (the requirement), not the near-monochrome of the stock
 *  Lab presets. */
function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

const SEEDS = Array.from({ length: 400 }, (_, i) => i * 5_000_003 + 7);

describe("randomTheme", () => {
  it("is deterministic for a given seed", () => {
    const a = randomTheme(1234);
    const b = randomTheme(1234);
    expect(a).toEqual(b);
  });

  it("always meets WCAG AA (4.5:1) for foreground text on background", () => {
    for (const seed of SEEDS) {
      const { tokens } = randomTheme(seed);
      const ratio = contrastRatio(tokens["--foreground"], tokens["--background"]);
      expect(ratio, `seed ${seed}: fg/bg contrast ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives both the background and the foreground text a real hue (not black/white)", () => {
    for (const seed of SEEDS) {
      const { tokens } = randomTheme(seed);
      const bgSat = saturation(tokens["--background"]);
      const fgSat = saturation(tokens["--foreground"]);
      expect(bgSat, `seed ${seed}: bg saturation ${bgSat.toFixed(3)}`).toBeGreaterThan(0.12);
      expect(fgSat, `seed ${seed}: fg saturation ${fgSat.toFixed(3)}`).toBeGreaterThan(0.05);
    }
  });
});
