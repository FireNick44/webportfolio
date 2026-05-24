import type { FieldConfig } from "./fieldConfig";
import {
  getSegmentHeight,
  FLASK_HITBOX_HEIGHT,
  MIN_SAME_LAYER_DISTANCE_PCT,
  MIN_CROSS_LAYER_DISTANCE_PCT,
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
function chainLength(segments: number): number {
  let s = 0;
  for (let k = 0; k < segments; k++) s += getSegmentHeight(k);
  return s;
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
    if (!isSkeleton && skillIdx < skills.length) skillIcon = skills[skillIdx++];
    return { xPct, anchorY, segments, color, scale, isSkeleton, layer, skillIcon };
  };

  // Chain length grows with depth: front tier ≈ minSeg (short), back tier ≈
  // maxSeg (way longer), interpolated across tiers, with ±1 jitter for variety.
  const tierSegments = (layer: number): number => {
    const t = tierCount > 1 ? layer / (tierCount - 1) : 0;
    const base = Math.round(minSeg + (maxSeg - minSeg) * t);
    const jitter = Math.floor(rng() * 3) - 1; // -1..+1
    return Math.max(minSeg, base + jitter);
  };

  // Vertical "top line" variety: a subtle jitter on every flask plus an
  // occasional bigger pop (biased upward so chain-tops stay behind the wave).
  // Always draws a fixed number of rng() values so tuning the magnitudes never
  // reshuffles the rest of the stream.
  const topLineY = (): number => {
    const rPop = rng();
    const rDir = rng();
    const rMag = rng();
    const rJit = rng();
    let y = TOP_LINE.baseY + (rJit - 0.5) * 2 * TOP_LINE.jitter;
    if (rPop < TOP_LINE.popChance) {
      const sign = rDir < TOP_LINE.upBias ? -1 : 1;
      y += sign * (TOP_LINE.popMin + rMag * (TOP_LINE.popMax - TOP_LINE.popMin));
    }
    return Math.max(TOP_LINE.ceilY, Math.min(TOP_LINE.floorY, y));
  };

  if (config.layout === "field") {
    const perTier = Math.ceil(config.flaskCount / tierCount);
    const PLACE_TRIES = 40;
    const placedXL: { x: number; layer: number }[] = [];
    const requiredGap = (a: number, b: number) =>
      a === b ? MIN_SAME_LAYER_DISTANCE_PCT : MIN_CROSS_LAYER_DISTANCE_PCT;

    // Best-effort horizontal placement: try random x's and take the first that
    // clears every placed flask by its required gap (wider within a layer, a
    // smaller cross-layer gap so nothing hangs directly behind a flask above
    // it). Front layers are placed first, so a long back flask is pushed off
    // any column already claimed above it. If nothing clears within the budget
    // (dense fields), keep the most-spread candidate — pack evenly, never drop.
    const sampleX = (layer: number): number => {
      let best = 0.5;
      let bestScore = -Infinity;
      for (let t = 0; t < PLACE_TRIES; t++) {
        const x = 0.03 + placeRng() * 0.94;
        let score = Infinity;
        for (const p of placedXL) {
          const norm = Math.abs(x - p.x) / requiredGap(layer, p.layer);
          if (norm < score) score = norm;
        }
        if (score >= 1) return x; // clears every required gap — take it
        if (score > bestScore) {
          bestScore = score;
          best = x;
        }
      }
      return best;
    };

    for (let i = 0; i < config.flaskCount; i++) {
      const layer = Math.min(Math.floor(i / perTier), tierCount - 1);
      const xPct = sampleX(layer);
      placedXL.push({ x: xPct, layer });
      const segments = tierSegments(layer);
      const anchorY = topLineY();
      out.push(makeFlask(xPct, layer, anchorY, segments));
    }
    out.sort((a, b) => b.layer - a.layer);
    return out;
  }

  // layout === "column"
  const colJitter = [-0.06, 0.07, -0.04, 0.05, -0.07, 0.04, 0.06];
  const bodyFrac = [0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.84];
  const foreground = Math.max(1, config.maxPhysicsFlasks);
  for (let i = 0; i < foreground; i++) {
    const xPct = 0.5 + (colJitter[i % colJitter.length] ?? 0);
    const segments = minSeg + (i % Math.max(1, maxSeg - minSeg + 1));
    const scale = config.layerScale[0];
    const anchorY =
      (bodyFrac[i % bodyFrac.length] ?? 0.5) * viewport.height -
      chainLength(segments) - (FLASK_HITBOX_HEIGHT * scale) / 2;
    out.push(makeFlask(xPct, 0, anchorY, segments));
  }
  const bgCount = Math.max(0, config.flaskCount - foreground);
  for (let i = 0; i < bgCount; i++) {
    const layer = 1 + (i % Math.max(1, tierCount - 1));
    const xPct = 0.12 + rng() * 0.76;
    const segments = minSeg + Math.floor(rng() * (maxSeg - minSeg + 1));
    const anchorY = (0.2 + rng() * 0.6) * viewport.height - chainLength(segments);
    out.push(makeFlask(xPct, layer, anchorY, segments));
  }
  out.sort((a, b) => b.layer - a.layer);
  return out;
}
