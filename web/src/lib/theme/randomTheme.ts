import {
  contrastRatio,
  harmonyHues,
  hslToHex,
  mulberry32,
  withAlpha,
  type SchemeType,
} from "./colorUtils";
import { SECTION_KEYS } from "./tokenNames";

/** Generate a theme from a 32-bit seed (deterministic — same seed → same
 *  theme, for shareable `#shuffle=<seed>` URLs). Builds a colour-harmony
 *  palette (base hue + scheme), guarantees WCAG AA text contrast, gives each
 *  section its own accent (harmony-derived), and a vivid 8-colour flask
 *  palette pushed off the backdrop's hue family. Returns the token map, the
 *  scheme, and the seed used. */
export function randomTheme(seed?: number): {
  scheme: "light" | "dark";
  tokens: Record<string, string>;
  seed: number;
} {
  const usedSeed = (seed ?? ((Math.random() * 0x7fffffff) | 0)) >>> 0;
  const rng = mulberry32(usedSeed);
  const rand = (a: number, b: number) => a + rng() * (b - a);

  const dark = rng() < 0.5;
  const baseHue = rng() * 360;
  const scheme: SchemeType = (
    ["complementary", "triadic", "analogous", "split"] as const
  )[Math.floor(rng() * 4)];
  const hues = harmonyHues(baseHue, scheme);

  // bg tinted by the base hue; fg a near-neutral, low-sat tint of a harmony
  // hue. Large light/dark luminance gap → readable; WCAG guard below
  // enforces it.
  const fgHue = hues[hues.length - 1];
  let bg: string, fg: string, card: string, muted: string, accentFg: string;
  if (dark) {
    bg = hslToHex(baseHue, rand(0.12, 0.3), rand(0.06, 0.11));
    card = hslToHex(baseHue, rand(0.12, 0.28), rand(0.1, 0.15));
    muted = hslToHex(baseHue, rand(0.1, 0.22), rand(0.12, 0.18));
    fg = hslToHex(fgHue, rand(0.05, 0.16), rand(0.88, 0.95));
    accentFg = hslToHex(baseHue, 0.2, 0.07);
  } else {
    bg = hslToHex(baseHue, rand(0.15, 0.35), rand(0.9, 0.96));
    card = hslToHex(baseHue, rand(0.12, 0.3), rand(0.94, 0.98));
    muted = hslToHex(baseHue, rand(0.12, 0.26), rand(0.86, 0.92));
    fg = hslToHex(fgHue, rand(0.18, 0.38), rand(0.08, 0.15));
    accentFg = "#ffffff";
  }

  // WCAG AA guard: if fg/bg contrast < 4.5:1, push fg toward the extreme
  // (lighter on dark, darker on light) in small steps until it passes.
  let fgL = dark ? rand(0.88, 0.95) : rand(0.08, 0.15);
  for (let guard = 0; guard < 12 && contrastRatio(fg, bg) < 4.5; guard++) {
    fgL = dark ? Math.min(1, fgL + 0.03) : Math.max(0, fgL - 0.03);
    fg = hslToHex(fgHue, dark ? 0.1 : 0.28, fgL);
  }

  const accent = hslToHex(
    hues[1 % hues.length],
    rand(0.62, 0.85),
    dark ? rand(0.55, 0.68) : rand(0.4, 0.5),
  );

  const tokens: Record<string, string> = {
    "--background": bg,
    "--foreground": fg,
    "--card": card,
    "--muted": muted,
    "--muted-foreground": withAlpha(fg, 0.55),
    "--accent": accent,
    "--accent-foreground": accentFg,
    "--border": withAlpha(fg, 0.14),
    "--input": withAlpha(fg, 0.14),
    "--ring": withAlpha(fg, 0.42),
    "--destructive": dark ? "#ff6b61" : "#b3261e",
  };

  // Per-section accents — one harmony-derived hue per section so each reads
  // with its own tint (links/labels/dots) while staying in the same family.
  SECTION_KEYS.forEach((key, i) => {
    const h = (hues[i % hues.length] + rand(-12, 12) + 360) % 360;
    tokens[`--accent-${key}`] = hslToHex(
      h,
      rand(0.6, 0.82),
      dark ? rand(0.55, 0.66) : rand(0.42, 0.52),
    );
  });

  // Backdrop hue family picked FIRST so the flask palette below can push its
  // own hues away from it — avoids the "green water in a green backdrop" case
  // where a flask vanishes into the band behind it.
  const bgHueStart = baseHue + rand(-15, 15);
  // Centre of the backdrop band (5 stops × 8° = 32° wide).
  const bgHueCentre = bgHueStart + 16;
  // Half-width of the forbidden zone for flask hues: band half-width (16°)
  // + a 22° buffer either side, so the nearest flask sits clearly off-band.
  const BG_AVOID_HALF = 38;

  // 8 vivid flask colours spread ~45° around the wheel (kept full-spectrum
  // so the icon-contrast picker still works) with seeded jitter. Any hue
  // landing inside the backdrop's avoid window gets shoved to the nearest
  // edge so the flask palette never shares the section's background hue.
  const flaskStart = rng() * 360;
  for (let i = 0; i < 8; i++) {
    let h = (flaskStart + i * 45 + rand(-15, 15) + 360) % 360;
    const delta = ((h - bgHueCentre + 540) % 360) - 180; // signed -180..+180
    if (Math.abs(delta) < BG_AVOID_HALF) {
      const sign = delta >= 0 ? 1 : -1;
      h = (bgHueCentre + sign * BG_AVOID_HALF + 360) % 360;
    }
    tokens[`--flask-c${i}`] = hslToHex(
      h,
      rand(0.65, 0.9),
      dark ? rand(0.55, 0.66) : rand(0.45, 0.58),
    );
  }

  // 5 backdrop bands behind the flask rack. One hue family per run (small
  // step top→bottom, like the original blue→purple SVG), darker / less
  // saturated than the flask water so flasks pop in front.
  for (let i = 0; i < 5; i++) {
    const h = (bgHueStart + i * 8 + 360) % 360;
    const l = dark
      ? 0.5 - i * 0.05 // dark: 50% → 30%
      : 0.7 - i * 0.05; // light: 70% → 50%
    const s = dark ? 0.55 - i * 0.03 : 0.5 - i * 0.03;
    tokens[`--skills-bg-${i}`] = hslToHex(h, Math.max(0.1, s), l);
  }

  return { scheme: dark ? "dark" : "light", tokens, seed: usedSeed };
}
