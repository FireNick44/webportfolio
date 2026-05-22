import type { FieldConfig } from "./fieldConfig";
import { getSegmentHeight, FLASK_HITBOX_HEIGHT, MIN_SAME_LAYER_DISTANCE_PCT } from "./constants";

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

/** Sum of scaled segment heights for a chain of `segments` links at `scale`. */
function chainLength(segments: number, scale: number): number {
  let s = 0;
  for (let k = 0; k < segments; k++) s += getSegmentHeight(k) * scale;
  return s;
}

export function generateFlasks(
  config: FieldConfig,
  viewport: { width: number; height: number },
  skillPaths: string[],
  seed = 42,
): FlaskConfig[] {
  const rng = mulberry32(seed);
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

  if (config.layout === "field") {
    const raw = Array.from({ length: config.flaskCount }, () => ({
      xPct: 0.03 + rng() * 0.94,
      segments: minSeg + Math.floor(rng() * (maxSeg - minSeg + 1)),
    }));
    raw.sort((a, b) => a.segments - b.segments);
    const perTier = Math.ceil(raw.length / tierCount);
    const placed: number[][] = Array.from({ length: tierCount }, () => []);
    for (let i = 0; i < raw.length; i++) {
      const layer = Math.min(Math.floor(i / perTier), tierCount - 1);
      const { xPct } = raw[i];
      if (placed[layer].some((x) => Math.abs(x - xPct) < MIN_SAME_LAYER_DISTANCE_PCT)) continue;
      placed[layer].push(xPct);
      out.push(makeFlask(xPct, layer, -80, raw[i].segments));
    }
    out.sort((a, b) => b.layer - a.layer);
    return out;
  }

  // layout === "column"
  const colJitter = [-0.05, 0.06, -0.04, 0.05];
  const bodyFrac = [0.32, 0.46, 0.58, 0.7];
  const foreground = Math.max(1, config.maxPhysicsFlasks);
  for (let i = 0; i < foreground; i++) {
    const xPct = 0.5 + (colJitter[i % colJitter.length] ?? 0);
    const segments = minSeg + (i % Math.max(1, maxSeg - minSeg + 1));
    const scale = config.layerScale[0];
    const anchorY =
      (bodyFrac[i % bodyFrac.length] ?? 0.5) * viewport.height -
      chainLength(segments, scale) - (FLASK_HITBOX_HEIGHT * scale) / 2;
    out.push(makeFlask(xPct, 0, anchorY, segments));
  }
  const bgCount = Math.max(0, config.flaskCount - foreground);
  for (let i = 0; i < bgCount; i++) {
    const layer = 1 + (i % Math.max(1, tierCount - 1));
    const xPct = 0.12 + rng() * 0.76;
    const segments = minSeg + Math.floor(rng() * (maxSeg - minSeg + 1));
    const scale = config.layerScale[layer] ?? config.layerScale[config.layerScale.length - 1];
    const anchorY = (0.2 + rng() * 0.6) * viewport.height - chainLength(segments, scale);
    out.push(makeFlask(xPct, layer, anchorY, segments));
  }
  out.sort((a, b) => b.layer - a.layer);
  return out;
}
