// Flask water palette + contrast-aware picker. The actual fill returned to
// the renderer is a CSS custom-property reference (`var(--flask-cN)`), so a
// theme swap re-tints the water without rebuilding the layout. The static
// RGBA list still drives the contrast ranking — the picker compares each
// flask's hue against the skill icon's dominant colour so a vivid icon never
// lands in a near-matching water.

/** Reference palette. Order MUST match the `--flask-cN` CSS vars. */
export const FLASK_COLORS = [
  "rgba(255, 86, 86, 0.7)", "rgba(86, 200, 255, 0.7)", "rgba(86, 255, 130, 0.7)",
  "rgba(255, 200, 60, 0.7)", "rgba(200, 86, 255, 0.7)", "rgba(255, 140, 60, 0.7)",
  "rgba(60, 255, 220, 0.7)", "rgba(255, 100, 180, 0.7)",
];

/** CSS-var references for SVG fill — what the renderer actually paints with.
 *  Alpha is applied separately via SVG `fill-opacity` (liquidOpacity slider). */
export const FLASK_COLOR_VARS = FLASK_COLORS.map(
  (_, i) => `var(--flask-c${i})`,
);

function parseRgbList(s: string): [number, number, number] {
  const m = s.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
}

function hexToRgb(h: string): [number, number, number] {
  const n = h.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16) || 0,
    parseInt(n.slice(2, 4), 16) || 0,
    parseInt(n.slice(4, 6), 16) || 0,
  ];
}

function rgbToHsl([r, g, b]: [number, number, number]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const FLASK_COLOR_HUES = FLASK_COLORS.map((c) => rgbToHsl(parseRgbList(c)).h);

/** Choose a flask colour, consuming exactly one rng value (`pick`, 0..1) so
 *  the layout RNG sequence is unchanged. With a vivid icon the pick is
 *  constrained to the most-contrasting half of the palette; neutral
 *  (greyscale / near-black / near-white) icons read fine on any water. */
export function pickFlaskColor(
  iconColor: string | undefined,
  pick: number,
): string {
  // Returns the CSS-var ref for the chosen palette slot (not the rgba). Hue
  // math still runs against the static FLASK_COLORS array so the contrast
  // ranking is identical regardless of which theme's tokens are active.
  if (!iconColor)
    return FLASK_COLOR_VARS[Math.floor(pick * FLASK_COLOR_VARS.length)];
  const { h, s, l } = rgbToHsl(hexToRgb(iconColor));
  if (s < 0.22 || l < 0.12 || l > 0.9)
    return FLASK_COLOR_VARS[Math.floor(pick * FLASK_COLOR_VARS.length)];
  const ranked = FLASK_COLOR_HUES.map((fh, idx) => ({
    idx,
    d: hueDistance(h, fh),
  })).sort((a, b) => b.d - a.d);
  const keep = ranked.slice(0, Math.ceil(ranked.length / 2));
  return FLASK_COLOR_VARS[keep[Math.floor(pick * keep.length)].idx];
}
