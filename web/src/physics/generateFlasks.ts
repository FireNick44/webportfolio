import type { FieldConfig } from "./fieldConfig";
import {
  FLASK_WIDTH,
  FLASK_HEIGHT,
  FLASK_HITBOX_HEIGHT,
  MIN_SAME_LAYER_DISTANCE_PCT,
  BODY_OVERLAP_PAD,
  TOP_LINE,
  chainLength,
  segmentsForLength,
} from "./constants";

export interface FlaskConfig {
  xPct: number;
  anchorY: number;
  segments: number;
  color: string;
  scale: number;
  isSkeleton: boolean;
  layer: number;
  skillIcon?: string;
}

export const FLASK_COLORS = [
  "rgba(255, 86, 86, 0.7)", "rgba(86, 200, 255, 0.7)", "rgba(86, 255, 130, 0.7)",
  "rgba(255, 200, 60, 0.7)", "rgba(200, 86, 255, 0.7)", "rgba(255, 140, 60, 0.7)",
  "rgba(60, 255, 220, 0.7)", "rgba(255, 100, 180, 0.7)",
];

// --- Icon/water contrast helpers ----------------------------------------
// Pick a flask water colour that doesn't camouflage the skill icon. We rank the
// palette by hue distance from the icon's dominant colour and keep only the more
// contrasting half, so e.g. cyan React never lands in teal/light-blue water.
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

/** Choose a flask colour for a flask, consuming exactly one rng value (`pick`,
 *  0..1) so the layout RNG sequence is unchanged. With a vivid icon colour the
 *  pick is constrained to the most-contrasting half of the palette; neutral
 *  (greyscale / near-black / near-white) icons read fine on any water. */
export function pickFlaskColor(
  iconColor: string | undefined,
  pick: number,
): string {
  if (!iconColor)
    return FLASK_COLORS[Math.floor(pick * FLASK_COLORS.length)];
  const { h, s, l } = rgbToHsl(hexToRgb(iconColor));
  if (s < 0.22 || l < 0.12 || l > 0.9)
    return FLASK_COLORS[Math.floor(pick * FLASK_COLORS.length)];
  const ranked = FLASK_COLOR_HUES.map((fh, idx) => ({
    idx,
    d: hueDistance(h, fh),
  })).sort((a, b) => b.d - a.d);
  const keep = ranked.slice(0, Math.ceil(ranked.length / 2));
  return FLASK_COLORS[keep[Math.floor(pick * keep.length)].idx];
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// chainLength / segmentsForLength now live in constants.ts (overlap-aware chain
// geometry, shared with createChainBodies + FlaskChain). Re-exported so existing
// imports (tests, PhysicsScene) keep resolving from here.
export { chainLength };

/** Vertical centre of a flask's body — used for back-to-front stacking so a
 *  HIGHER flask (smaller y) paints on top and a lower flask's long chain tucks
 *  behind the flasks above it. Includes the scaled half-hitbox so mixed sizes
 *  compare by where the body actually sits, not just the chain bottom. */
function bodyCenterY(f: FlaskConfig): number {
  return f.anchorY + chainLength(f.segments) + (FLASK_HITBOX_HEIGHT * f.scale) / 2;
}

export function generateFlasks(
  config: FieldConfig,
  viewport: { width: number; height: number },
  skillPaths: string[],
  seed = 42,
  /** svgPath → dominant icon colour, used to pick contrasting water. */
  colorByPath?: Record<string, string>,
  /** Top/bottom WaveDivider height (px). When given, flask bodies are kept a
   *  flask-half below the top wave and above the bottom wave so none hang inside
   *  the animated wave bands. Omitted (tests) → small fractional insets. */
  waveHeight?: number,
): FlaskConfig[] {
  const rng = mulberry32(seed);
  // Separate stream for horizontal placement so tuning spacing/retries never
  // reshuffles attribute draws (colors, icons, segments, anchorY).
  const placeRng = mulberry32(seed ^ 0x9e3779b9);
  const tierCount = config.layerScale.length;
  const firstSkelTier = tierCount - config.skeletonBands;
  const [minSeg, configMaxSeg] = config.segmentRange;

  const skills = [...skillPaths];
  for (let i = skills.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [skills[i], skills[j]] = [skills[j], skills[i]];
  }
  let skillIdx = 0;
  let physicsCount = 0;
  const out: FlaskConfig[] = [];

  const makeFlask = (
    xPct: number,
    layer: number,
    anchorY: number,
    segments: number,
  ): FlaskConfig => {
    const scale = config.layerScale[layer];
    const bandSkeleton = layer >= firstSkelTier;
    // Foreground tiers carry the skill icons; back-tier bands stay decorative.
    let skillIcon: string | undefined;
    if (!bandSkeleton && skillIdx < skills.length) skillIcon = skills[skillIdx++];

    // Skeleton (static, no physics) rules:
    //  • back-tier bands are always decorative skeletons;
    //  • motion off (maxPhysicsFlasks 0 → reduced-motion) → whole rack static;
    //  • desktop field: EVERY icon-bearing flask is interactive — an icon-less
    //    foreground flask becomes a decorative skeleton instead;
    //  • mobile column: keep the physics budget (overflow icon flasks go static
    //    but still show their icon).
    const motionOff = config.maxPhysicsFlasks === 0;
    const overBudget = !bandSkeleton && physicsCount >= config.maxPhysicsFlasks;
    const isSkeleton =
      bandSkeleton ||
      motionOff ||
      (config.layout === "field" ? !skillIcon : overBudget);
    if (!isSkeleton) physicsCount++;

    // One rng draw either way → layout sequence unchanged. Icon flasks get a
    // hue-contrasting water colour (see pickFlaskColor); others stay random.
    const iconColor = skillIcon ? colorByPath?.[skillIcon] : undefined;
    const color = pickFlaskColor(iconColor, rng());
    return { xPct, anchorY, segments, color, scale, isSkeleton, layer, skillIcon };
  };

  // Shared body-aware placement: pick a random x that doesn't overlap any placed
  // flask (same-layer column gap OR a 2D body-box overlap). Random x → no rigid
  // columns; the 2D test keeps bodies from stacking. Used by BOTH the desktop
  // field and the mobile scatter.
  const PLACE_TRIES = 80;
  const sameLayerGapPx = MIN_SAME_LAYER_DISTANCE_PCT * viewport.width;
  type Placed = { xpx: number; bodyY: number; scale: number; layer: number };
  const placed: Placed[] = [];
  const conflicts = (a: Placed, p: Placed): boolean => {
    if (a.layer === p.layer && Math.abs(a.xpx - p.xpx) < sameLayerGapPx)
      return true;
    const minDx =
      ((FLASK_WIDTH * a.scale + FLASK_WIDTH * p.scale) / 2) * BODY_OVERLAP_PAD;
    const minDy =
      ((FLASK_HEIGHT * a.scale + FLASK_HEIGHT * p.scale) / 2) * BODY_OVERLAP_PAD;
    return (
      Math.abs(a.xpx - p.xpx) < minDx && Math.abs(a.bodyY - p.bodyY) < minDy
    );
  };
  const sampleX = (layer: number, scale: number, bodyY: number): number => {
    let bestX = 0.5;
    let bestConflicts = Infinity;
    for (let t = 0; t < PLACE_TRIES; t++) {
      const xPct = 0.03 + placeRng() * 0.94;
      const cand: Placed = { xpx: xPct * viewport.width, bodyY, scale, layer };
      let n = 0;
      for (const p of placed) if (conflicts(cand, p)) n++;
      if (n === 0) return xPct;
      if (n < bestConflicts) {
        bestConflicts = n;
        bestX = xPct;
      }
    }
    return bestX;
  };

  // Back-solve a chain so the flask BODY lands at (≈) targetBodyY while the chain
  // TOP always stays at/above floorY — i.e. tucked behind the top wave, never
  // starting in mid-air. DEPTH (not tier) drives chain length now, so a flask of
  // any size can hang at any height. If even the longest chain (maxSeg) can't
  // reach targetBodyY, the body is pulled up to the deepest reachable point
  // rather than letting the chain top drop into view (the old "thin-air" bug).
  // Even vertical fill: spread flask bodies across the section. When the wave
  // height is known, leave a gap = wave + half a full-size flask top & bottom so
  // no body hangs inside the animated wave bands; otherwise small fractions.
  const HIDDEN_TOP = TOP_LINE.floorY;
  const waveGap = waveHeight != null ? waveHeight + FLASK_HEIGHT / 2 : undefined;
  const fillTop = waveGap ?? 0.06 * viewport.height;
  const fillBot = viewport.height - (waveGap ?? 0.05 * viewport.height);
  // Joint overlap shrinks each chain, so the longest chain needs more segments to
  // reach the deepest target. Grow maxSeg past the config floor as needed (capped
  // for sanity) so the rack still fills to the bottom whatever the overlap.
  const maxSeg = Math.min(
    64,
    Math.max(configMaxSeg, segmentsForLength(fillBot - HIDDEN_TOP)),
  );

  // Back-solve a chain so the flask BODY lands at (≈) targetBodyY while the chain
  // TOP always stays at/above floorY — tucked behind the top wave, never starting
  // mid-air. DEPTH (not tier) drives chain length now.
  const solveChain = (targetBodyY: number, scale: number) => {
    const half = (FLASK_HITBOX_HEIGHT * scale) / 2;
    const reachMax = HIDDEN_TOP + chainLength(maxSeg) + half;
    const target = Math.min(targetBodyY, reachMax);
    const want = target - half - HIDDEN_TOP;
    const segments = Math.max(minSeg, Math.min(maxSeg, segmentsForLength(want)));
    // Chain top must tuck behind the wave (≤ HIDDEN_TOP) — never start mid-air.
    // Math.min also absorbs float drift at the reachMax boundary. bodyY is then
    // derived from the final anchor so placement/render stay consistent.
    const anchorY = Math.min(target - chainLength(segments) - half, HIDDEN_TOP);
    const bodyY = anchorY + chainLength(segments) + half;
    return { segments, anchorY, bodyY };
  };

  if (config.layout === "field") {
    const perTier = Math.ceil(config.flaskCount / tierCount);
    // Stratify depth across all flasks (even fill) but in a SHUFFLED order so
    // depth is independent of tier → big (front) and small (back) flasks mix at
    // every height, instead of small-only along the bottom. Placement stream so
    // tuning the spread never reshuffles colours/icons.
    const strata = Array.from({ length: config.flaskCount }, (_, k) => k);
    for (let k = strata.length - 1; k > 0; k--) {
      const j = Math.floor(placeRng() * (k + 1));
      [strata[k], strata[j]] = [strata[j], strata[k]];
    }
    for (let i = 0; i < config.flaskCount; i++) {
      const layer = Math.min(Math.floor(i / perTier), tierCount - 1);
      const scale = config.layerScale[layer];
      const frac = (strata[i] + placeRng()) / config.flaskCount;
      const target = fillTop + frac * (fillBot - fillTop);
      const { segments, anchorY, bodyY } = solveChain(target, scale);
      const xPct = sampleX(layer, scale, bodyY);
      placed.push({ xpx: xPct * viewport.width, bodyY, scale, layer });
      out.push(makeFlask(xPct, layer, anchorY, segments));
    }

    // Decorative background skeletons: extra back-tier ghosts for depth, spread
    // across the full height too — now routed through the SAME conflict check so
    // they no longer stack on each other (or on the rack). No icon, no physics.
    const bgCount = config.bgSkeletons ?? 0;
    for (let i = 0; i < bgCount; i++) {
      const layer = firstSkelTier + (i % Math.max(1, config.skeletonBands));
      const scaleL = config.layerScale[layer];
      const target = fillTop + placeRng() * (fillBot - fillTop);
      const { segments, anchorY, bodyY } = solveChain(target, scaleL);
      const xPct = sampleX(layer, scaleL, bodyY);
      placed.push({ xpx: xPct * viewport.width, bodyY, scale: scaleL, layer });
      out.push(makeFlask(xPct, layer, anchorY, segments));
    }

    // Cover flasks: a handful of larger icon-less flasks hung HIGH (cork just
    // below — sometimes a touch behind — the top wave, so barely any chain shows,
    // then the flask) over the busier columns, adding depth/disruption near the
    // surface. Sizes vary, never as tiny as the back ghosts. Generated BEFORE the
    // sort so they sort BEHIND the physics flasks (a backdrop, not foreground).
    const coverCount = config.coverSkeletons ?? 0;
    if (coverCount > 0 && placed.length) {
      const BINS = 18;
      const hist = new Array(BINS).fill(0);
      for (const p of placed) {
        const b = Math.min(BINS - 1, Math.max(0, Math.floor((p.xpx / viewport.width) * BINS)));
        hist[b]++;
      }
      const bins = hist
        .map((c, i) => ({ c, i }))
        .sort((a, b) => b.c - a.c)
        .slice(0, coverCount);
      const corkRef = fillTop - FLASK_HEIGHT / 2; // ≈ wave bottom (a full flask's cork at fillTop)
      for (const { i: bin } of bins) {
        const xPct = (bin + 0.15 + placeRng() * 0.7) / BINS;
        const scale = 0.45 + placeRng() * 0.85; // 0.45..1.3 — big AND small, but not back-ghost tiny
        // Back the body out from a cork that sits just below (or a touch behind)
        // the wave, so the flask hangs near the surface on a barely-seen chain.
        const cork = corkRef + (placeRng() * 0.18 - 0.03) * viewport.height;
        const { segments, anchorY } = solveChain(
          cork + (FLASK_HEIGHT / 2) * scale,
          scale,
        );
        out.push({
          xPct,
          anchorY,
          segments,
          color: pickFlaskColor(undefined, rng()),
          scale,
          isSkeleton: true,
          layer: 0,
        });
      }
    }

    // Stacking (DOM paint order): background skeletons + cover flasks first
    // (behind), then the physics flasks ordered so a HIGHER flask paints last =
    // on top, and a lower flask's long chain tucks behind the flasks above it.
    // z-index isn't used so the whole rack stays behind the wave dividers.
    out.sort(
      (a, b) =>
        Number(b.isSkeleton) - Number(a.isSkeleton) ||
        bodyCenterY(b) - bodyCenterY(a),
    );
    return out;
  }

  // layout === "column" (mobile): a dense SCATTER of one foreground flask per
  // skill on top-anchored chains, plus background skeletons for depth. Same
  // even-fill + back-solve as the field; depth, not tier, sets chain length.
  const scale0 = config.layerScale[0];
  // Show EVERY skill: one foreground flask per skill (capped by flaskCount).
  // Only maxPhysicsFlasks are physics; the rest are static skill flasks.
  const foreground = Math.max(1, Math.min(skills.length, config.flaskCount));
  for (let i = 0; i < foreground; i++) {
    // Stratified + jittered so the ending depths are organic, not evenly stepped.
    const frac = foreground > 1 ? (i + placeRng()) / foreground : 0.5;
    const target = fillTop + frac * (fillBot - fillTop);
    const { segments, anchorY, bodyY } = solveChain(target, scale0);
    const xPct = sampleX(0, scale0, bodyY);
    placed.push({ xpx: xPct * viewport.width, bodyY, scale: scale0, layer: 0 });
    out.push(makeFlask(xPct, 0, anchorY, segments));
  }
  const bgCount = Math.max(0, config.flaskCount - foreground);
  for (let i = 0; i < bgCount; i++) {
    const layer = 1 + (i % Math.max(1, tierCount - 1));
    const scaleL = config.layerScale[layer];
    const target = fillTop + placeRng() * (fillBot - fillTop);
    const { segments, anchorY, bodyY } = solveChain(target, scaleL);
    const xPct = sampleX(layer, scaleL, bodyY);
    placed.push({ xpx: xPct * viewport.width, bodyY, scale: scaleL, layer });
    out.push(makeFlask(xPct, layer, anchorY, segments));
  }
  // Same stacking rule as the field: background skeletons behind, then physics
  // flasks with higher ones painting on top.
  out.sort(
    (a, b) =>
      Number(b.isSkeleton) - Number(a.isSkeleton) ||
      bodyCenterY(b) - bodyCenterY(a),
  );
  return out;
}
