// The fixed theme presets surfaced in the editor picker. The base
// light/dark palettes live in globals.css (`:root` / `[data-theme]`); a
// preset with `tokens: null` defers to that. Anything else is a complete
// token set applied as inline custom properties on <html>.

import { withAlpha } from "./colorUtils";
import type { TokenMap } from "./tokenNames";

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
  /** Swatch dots for the picker card. */
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
