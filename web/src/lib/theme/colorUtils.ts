// Colour-science helpers shared between the theme presets and the random
// generator. All functions are pure; safe to import from any layer.

export type SchemeType =
  | "complementary"
  | "triadic"
  | "analogous"
  | "split";

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** h in [0,360), s/l in [0,1] → #rrggbb. */
export function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const ch = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(8)}${ch(4)}`;
}

/** WCAG relative luminance (on #rrggbb). */
export function luminance(hex: string): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Hues derived from a base hue per a colour-theory scheme. */
export function harmonyHues(base: number, scheme: SchemeType): number[] {
  const n = (h: number) => ((h % 360) + 360) % 360;
  switch (scheme) {
    case "complementary":
      return [base, base + 180].map(n);
    case "triadic":
      return [base, base + 120, base + 240].map(n);
    case "analogous":
      return [base, base + 30, base - 30, base + 60].map(n);
    case "split":
      return [base, base + 150, base + 210].map(n);
  }
}

// mulberry32 lives in `@/lib/utils/mulberry32.ts` — shared between the theme
// generator, the physics flask layout and the underwater scene generators.
export { mulberry32 } from "@/lib/utils/mulberry32";
