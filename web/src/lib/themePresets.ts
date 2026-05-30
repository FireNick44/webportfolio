// Theme presets + the live design-token system used by the settings page.
//
// The base light/dark palettes live in globals.css (`:root` / `[data-theme]`).
// A preset is a *complete* token set applied as inline custom properties on
// <html>, which override the CSS defaults. Each preset also declares whether it
// is a light or dark scheme so `data-theme` (color-scheme + Tailwind `dark:`)
// stays correct.

/** Every token the editor + presets manage. Order = display order. */
export const TOKEN_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--destructive",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];
export type TokenMap = Partial<Record<TokenName, string>>;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** h in [0,360), s/l in [0,1] → #rrggbb. */
function hslToHex(h: number, s: number, l: number): string {
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

/** The flask water palette vars (set by `randomTheme`, otherwise from
 *  globals.css per theme). Applied alongside TOKEN_NAMES so a shuffle recolours
 *  the water too. */
export const FLASK_VAR_NAMES = Array.from(
  { length: 8 },
  (_, i) => `--flask-c${i}`,
);

/** The 5 colour bands behind the flask rack (FlaskBackdrop). Same shuffle
 *  cycle as the flask water so the section reads as one theme. Defaults live
 *  in globals.css per scheme; `randomTheme` overwrites them with a hue family
 *  derived from the run's base hue so the backdrop harmonises with the rest. */
export const SKILLS_BG_VARS = Array.from(
  { length: 5 },
  (_, i) => `--skills-bg-${i}`,
);

/** Per-section accent vars. globals.css maps each section's local `--accent`
 *  to these (with an `inherit` fallback so a section reverts to the base accent
 *  when its var is unset — i.e. on the default light/dark themes). Only a
 *  shuffled/custom theme sets them, giving each section its own accent tint. */
export const SECTION_KEYS = [
  "me",
  "skills",
  "projects",
  "contact",
  "footer",
] as const;
export const SECTION_ACCENT_VARS = SECTION_KEYS.map((k) => `--accent-${k}`);

/** Small seeded PRNG (mulberry32) so a theme can be reproduced from its seed
 *  for shareable `#shuffle=<seed>` URLs. */
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** WCAG relative luminance + contrast ratio (on #rrggbb). */
function luminance(hex: string): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

type SchemeType = "complementary" | "triadic" | "analogous" | "split";

/** Hues derived from a base hue per a colour-theory scheme. */
function harmonyHues(base: number, scheme: SchemeType): number[] {
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

interface PresetSeed {
  bg: string;
  fg: string;
  card: string;
  muted: string;
  accent: string;
  accentFg: string;
  destructive: string;
}

/** Expand a compact seed into the full token map (derives muted-fg/border/etc). */
function build(seed: PresetSeed): TokenMap {
  return {
    "--background": seed.bg,
    "--foreground": seed.fg,
    "--card": seed.card,
    "--muted": seed.muted,
    "--muted-foreground": withAlpha(seed.fg, 0.55),
    "--accent": seed.accent,
    "--accent-foreground": seed.accentFg,
    "--border": withAlpha(seed.fg, 0.14),
    "--input": withAlpha(seed.fg, 0.14),
    "--ring": withAlpha(seed.fg, 0.42),
    "--destructive": seed.destructive,
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  scheme: "light" | "dark";
  /** null tokens = use the globals.css defaults for this scheme (no overrides). */
  tokens: TokenMap | null;
  /** swatch dots for the picker card */
  swatch: string[];
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "lab-light",
    name: "Lab · Light",
    scheme: "light",
    tokens: null,
    swatch: ["#efeae0", "#14130f", "#1f6f63"],
  },
  {
    id: "lab-dark",
    name: "Lab · Dark",
    scheme: "dark",
    tokens: null,
    swatch: ["#0a0b0c", "#ece6da", "#7fe3d0"],
  },
  {
    id: "mocha",
    name: "Catppuccin · Mocha",
    scheme: "dark",
    tokens: build({
      bg: "#1e1e2e",
      fg: "#cdd6f4",
      card: "#181825",
      muted: "#313244",
      accent: "#89b4fa",
      accentFg: "#1e1e2e",
      destructive: "#f38ba8",
    }),
    swatch: ["#1e1e2e", "#cdd6f4", "#89b4fa"],
  },
  {
    id: "latte",
    name: "Catppuccin · Latte",
    scheme: "light",
    tokens: build({
      bg: "#eff1f5",
      fg: "#4c4f69",
      card: "#e6e9ef",
      muted: "#ccd0da",
      accent: "#1e66f5",
      accentFg: "#eff1f5",
      destructive: "#d20f39",
    }),
    swatch: ["#eff1f5", "#4c4f69", "#1e66f5"],
  },
  {
    id: "dracula",
    name: "Dracula",
    scheme: "dark",
    tokens: build({
      bg: "#282a36",
      fg: "#f8f8f2",
      card: "#21222c",
      muted: "#44475a",
      accent: "#bd93f9",
      accentFg: "#282a36",
      destructive: "#ff5555",
    }),
    swatch: ["#282a36", "#f8f8f2", "#bd93f9"],
  },
  {
    id: "nord",
    name: "Nord",
    scheme: "dark",
    tokens: build({
      bg: "#2e3440",
      fg: "#eceff4",
      card: "#3b4252",
      muted: "#434c5e",
      accent: "#88c0d0",
      accentFg: "#2e3440",
      destructive: "#bf616a",
    }),
    swatch: ["#2e3440", "#eceff4", "#88c0d0"],
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    scheme: "dark",
    tokens: build({
      bg: "#282828",
      fg: "#ebdbb2",
      card: "#32302f",
      muted: "#504945",
      accent: "#fabd2f",
      accentFg: "#282828",
      destructive: "#fb4934",
    }),
    swatch: ["#282828", "#ebdbb2", "#fabd2f"],
  },
];

export function getPreset(id: string | null): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/**
 * Reconcile inline token overrides on <html>: set the ones present, remove the
 * rest. Idempotent — safe to call on every change.
 */
export function applyTokenOverrides(overrides: Record<string, string>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Theme tokens AND the flask palette vars: set the present ones, clear the
  // rest (so switching from a random theme back to a preset drops the random
  // flask colours and falls back to the globals.css per-theme defaults).
  for (const name of [
    ...TOKEN_NAMES,
    ...FLASK_VAR_NAMES,
    ...SECTION_ACCENT_VARS,
    ...SKILLS_BG_VARS,
  ]) {
    const v = overrides[name];
    if (v) root.style.setProperty(name, v);
    else root.style.removeProperty(name);
  }
}

/** Generate a theme from a 32-bit seed (deterministic — same seed → same
 *  theme, for shareable `#shuffle=<seed>` URLs). Builds a colour-harmony
 *  palette (base hue + scheme), guarantees WCAG AA text contrast, gives each
 *  section its own accent (harmony-derived), and a vivid 8-colour flask
 *  palette. Returns the token map, the scheme, and the seed used. */
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

  // bg tinted by the base hue; fg a near-neutral, low-sat tint of a harmony hue.
  // Large light/dark luminance gap → readable; WCAG guard below enforces it.
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

  const tokens: Record<string, string> = build({
    bg,
    fg,
    card,
    muted,
    accent,
    accentFg,
    destructive: dark ? "#ff6b61" : "#b3261e",
  }) as Record<string, string>;

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
  // Half-width of the forbidden zone for flask hues: band half-width (16°) +
  // a 22° buffer either side, so the nearest flask sits clearly off-band.
  const BG_AVOID_HALF = 38;

  // 8 vivid flask colours spread ~45° around the wheel (kept full-spectrum so
  // the icon-contrast picker still works) with seeded jitter. Any hue landing
  // inside the backdrop's avoid window gets shoved to the nearest edge so the
  // flask palette never shares the section's background hue.
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

  // 5 backdrop bands behind the flask rack. One hue family per run (small step
  // top→bottom, like the original blue→purple SVG), darker / less saturated
  // than the flask water so flasks pop in front. Light + dark schemes use
  // different luminance bands so the backdrop reads "behind" the rest of the
  // section, not "competing".
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
