import type { FieldConfig } from "./fieldConfig";
import {
  getSegmentHeight,
  FLASK_WIDTH,
  FLASK_HEIGHT,
  FLASK_HITBOX_HEIGHT,
  MIN_SAME_LAYER_DISTANCE_PCT,
  BODY_OVERLAP_PAD,
  TOP_LINE,
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

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sum of (unscaled) segment heights for a chain of `segments` links. Chain
 *  length is independent of depth-scale (only width/thickness scales). */
export function chainLength(segments: number): number {
  let s = 0;
  for (let k = 0; k < segments; k++) s += getSegmentHeight(k);
  return s;
}

/** Smallest segment count whose chain reaches at least `len` px. */
function segmentsForLength(len: number): number {
  let n = 0;
  let s = 0;
  while (s < len) {
    s += getSegmentHeight(n);
    n++;
  }
  return Math.max(1, n);
}

/** Hanging depth of a flask's body — used for back-to-front z-ordering so a
 *  lower flask (and its long chain) renders behind the flasks above it. */
function bodyDepth(f: FlaskConfig): number {
  return f.anchorY + chainLength(f.segments);
}

export function generateFlasks(
  config: FieldConfig,
  viewport: { width: number; height: number },
  skillPaths: string[],
  seed = 42,
): FlaskConfig[] {
  const rng = mulberry32(seed);
  // Separate stream for horizontal placement so tuning spacing/retries never
  // reshuffles attribute draws (colors, icons, segments, anchorY).
  const placeRng = mulberry32(seed ^ 0x9e3779b9);
  const tierCount = config.layerScale.length;
  const firstSkelTier = tierCount - config.skeletonBands;
  const [minSeg, maxSeg] = config.segmentRange;

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
    const color = FLASK_COLORS[Math.floor(rng() * FLASK_COLORS.length)];
    const bandSkeleton = layer >= firstSkelTier;
    const overBudget = !bandSkeleton && physicsCount >= config.maxPhysicsFlasks;
    const isSkeleton = bandSkeleton || overBudget;
    if (!isSkeleton) physicsCount++;
    let skillIcon: string | undefined;
    // Foreground-tier flasks show a skill even when static (over the physics
    // budget) — only the decorative back-tier skeletons stay icon-less. This is
    // how EVERY skill stays visible while only a few flasks are interactive.
    if (!bandSkeleton && skillIdx < skills.length) skillIcon = skills[skillIdx++];
    return { xPct, anchorY, segments, color, scale, isSkeleton, layer, skillIcon };
  };

  // Chain length grows with depth: front tier ≈ minSeg (short), back tier ≈
  // maxSeg (way longer), interpolated across tiers, with ±2 jitter so chains
  // within a layer hang at varied depths (not a single row).
  const tierSegments = (layer: number): number => {
    const t = tierCount > 1 ? layer / (tierCount - 1) : 0;
    const base = Math.round(minSeg + (maxSeg - minSeg) * t);
    const jitter = Math.floor(rng() * 5) - 2; // -2..+2
    return Math.max(minSeg, Math.min(maxSeg, base + jitter));
  };

  // Vertical "top line" variety: spread anchors WIDELY (not on a line) across
  // the safe band so flasks don't hang in per-layer rows. Upward-biased via
  // spreadSkew (more safe room above the wave) plus a fine wobble.
  const topLineY = (): number => {
    const u = rng();
    const wob = rng();
    const t = Math.pow(u, TOP_LINE.spreadSkew); // 0..1, leaned upward
    let y = TOP_LINE.floorY + t * (TOP_LINE.ceilY - TOP_LINE.floorY);
    y += (wob - 0.5) * 2 * TOP_LINE.jitter;
    return Math.max(TOP_LINE.ceilY, Math.min(TOP_LINE.floorY, y));
  };

  // Shared body-aware placement: pick a random x that doesn't overlap any placed
  // flask (same-layer column gap OR a 2D body-box overlap). Random x → no rigid
  // columns; the 2D test keeps bodies from stacking. Used by BOTH the desktop
  // field and the mobile scatter.
  const PLACE_TRIES = 40;
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

  if (config.layout === "field") {
    const perTier = Math.ceil(config.flaskCount / tierCount);
    for (let i = 0; i < config.flaskCount; i++) {
      const layer = Math.min(Math.floor(i / perTier), tierCount - 1);
      const segments = tierSegments(layer);
      const anchorY = topLineY();
      const scale = config.layerScale[layer];
      const bodyY =
        anchorY + chainLength(segments) + (FLASK_HITBOX_HEIGHT * scale) / 2;
      const xPct = sampleX(layer, scale, bodyY);
      placed.push({ xpx: xPct * viewport.width, bodyY, scale, layer });
      out.push(makeFlask(xPct, layer, anchorY, segments));
    }
    out.sort((a, b) => b.layer - a.layer || bodyDepth(b) - bodyDepth(a));
    return out;
  }

  // layout === "column" (mobile): a random, dense SCATTER (no rigid columns) of
  // one foreground flask per skill, on long top-anchored chains. Random x with
  // 2D anti-overlap (shared with the field); continuous depth fills the tall
  // section evenly. Background skeletons sit behind for depth.
  const TOP_ANCHOR = -50;
  const scale0 = config.layerScale[0];
  const halfFlask0 = (FLASK_HITBOX_HEIGHT * scale0) / 2;
  // Show EVERY skill: one foreground flask per skill (capped by flaskCount).
  // Only maxPhysicsFlasks are physics; the rest are static skill flasks.
  const foreground = Math.max(1, Math.min(skills.length, config.flaskCount));
  const topGuide = 0.03 * viewport.height;
  const depthSpan = 0.8 * viewport.height; // tighter → more compact, less chain whitespace
  for (let i = 0; i < foreground; i++) {
    const frac = foreground > 1 ? i / (foreground - 1) : 0;
    // Spread bodies down the section; back-solve the ANCHOR so the body lands
    // here. (Fixing the anchor and clamping the chain instead piled shallow
    // flasks at the min-chain depth and left the top empty.) A wide jitter makes
    // the ending depths varied/organic rather than evenly stepped.
    const targetBodyY = topGuide + frac * depthSpan + (rng() - 0.5) * 70;
    const jit = Math.floor(rng() * 3) - 1; // ±1 seg jitter
    const segments = Math.max(
      minSeg,
      Math.min(maxSeg, segmentsForLength(targetBodyY - TOP_ANCHOR) + jit)
    );
    const anchorY = targetBodyY - chainLength(segments) - halfFlask0;
    const xPct = sampleX(0, scale0, targetBodyY);
    placed.push({ xpx: xPct * viewport.width, bodyY: targetBodyY, scale: scale0, layer: 0 });
    out.push(makeFlask(xPct, 0, anchorY, segments));
  }
  const bgCount = Math.max(0, config.flaskCount - foreground);
  for (let i = 0; i < bgCount; i++) {
    const layer = 1 + (i % Math.max(1, tierCount - 1));
    const scaleL = config.layerScale[layer];
    const xPct = 0.08 + rng() * 0.84;
    // Ghosts (background skeletons) end at WIDELY varied depths (not just
    // middle/bottom); back-solve the anchor so their chains still come from the
    // top like the foreground.
    const bodyY = (0.08 + rng() * 0.86) * viewport.height;
    const segments = Math.max(
      minSeg,
      Math.min(maxSeg, segmentsForLength(bodyY - TOP_ANCHOR))
    );
    const anchorY =
      bodyY - chainLength(segments) - (FLASK_HITBOX_HEIGHT * scaleL) / 2;
    out.push(makeFlask(xPct, layer, anchorY, segments));
  }
  out.sort((a, b) => b.layer - a.layer || bodyDepth(b) - bodyDepth(a));
  return out;
}
