import type { FlaskConfig, LayoutConfig, SkillEntry } from "../types/flask";
import { mulberry32 } from "./rng";
import { MIN_FLASK_SEGMENTS, MAX_FLASK_SEGMENTS } from "../physics/constants";

const PALETTE = [
  "rgba(255, 86, 86, 0.7)",
  "rgba(86, 200, 255, 0.7)",
  "rgba(86, 255, 130, 0.7)",
  "rgba(255, 200, 60, 0.7)",
  "rgba(200, 86, 255, 0.7)",
  "rgba(255, 140, 60, 0.7)",
  "rgba(60, 255, 220, 0.7)",
  "rgba(255, 100, 180, 0.7)",
];

interface Args {
  width: number;
  height: number;
  isMobile: boolean;
  skills: SkillEntry[];
  seed: number;
  config: LayoutConfig;
}

// Single source of truth for the width-driven flask count.
// Used both here and as the PhysicsScene memo key so the two never drift.
export function computeTargetCount(width: number, config: LayoutConfig): number {
  const perBand = Math.max(1, Math.floor(width / config.flaskSpacingX));
  return Math.max(
    config.minFlasks,
    Math.min(config.maxFlasks, config.columnCount * perBand)
  );
}

// Map a 0..1 "rank" (0 = highest priority) to a segment count.
// Higher priority => fewer segments => shorter chain => hangs higher.
function segmentsForRank(rank: number, rng: () => number): number {
  const span = MAX_FLASK_SEGMENTS - MIN_FLASK_SEGMENTS;
  const jitter = Math.floor(rng() * 3) - 1; // ±1
  return Math.max(
    MIN_FLASK_SEGMENTS,
    Math.min(
      MAX_FLASK_SEGMENTS,
      MIN_FLASK_SEGMENTS + Math.round(rank * span) + jitter
    )
  );
}

// Pixel-spaced rejection sampling within a band's full width.
function sampleX(width: number, spacing: number, placed: number[], rng: () => number): number {
  for (let attempt = 0; attempt < 60; attempt++) {
    const cand = spacing / 2 + rng() * Math.max(1, width - spacing);
    if (placed.every((p) => Math.abs(p - cand) >= spacing)) return cand;
  }
  return -1; // band is full
}

export function generateFlaskField(args: Args): FlaskConfig[] {
  if (args.isMobile) return generateMobileField(args);

  const { width, skills, seed, config } = args;
  const rng = mulberry32(seed);
  const { columnCount, skeletonBands, flaskSpacingX, maxPhysicsFlasks } = config;

  // 1. Width-driven, clamped count. Derive perBand FROM the clamped total
  //    (not raw width) so an ultrawide clamp can't overfill the back bands.
  const targetCount = computeTargetCount(width, config);
  const perBand = Math.floor(targetCount / columnCount);
  const remainder = targetCount - perBand * columnCount; // extra goes to the front band

  // 2. Skills sorted by priority desc (missing priority => mid).
  const sorted = [...skills].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

  const flasks: FlaskConfig[] = [];
  const firstSkeletonBand = columnCount - skeletonBands;
  let skillIdx = 0;
  let physicsCount = 0;

  for (let layer = 0; layer < columnCount; layer++) {
    const bandSlots = perBand + (layer === 0 ? remainder : 0);
    const placedX: number[] = [];

    for (let s = 0; s < bandSlots; s++) {
      const x = sampleX(width, flaskSpacingX, placedX, rng);
      if (x < 0) break; // band full; stop crowding it
      placedX.push(x);

      const bandIsSkeleton = layer >= firstSkeletonBand;
      const overBudget = !bandIsSkeleton && physicsCount >= maxPhysicsFlasks;
      const isSkeleton = bandIsSkeleton || overBudget;
      if (!isSkeleton) physicsCount++;

      // Assign a skill (icon) only to non-skeleton slots, in priority order.
      let skillIcon: string | undefined;
      let color: string | undefined;
      let rank = rng(); // default rank for plain flasks
      if (!isSkeleton && skillIdx < sorted.length) {
        const skill = sorted[skillIdx];
        skillIcon = skill.svgPath;
        color = skill.color;
        rank = sorted.length > 1 ? skillIdx / (sorted.length - 1) : 0;
        skillIdx++;
      }

      flasks.push({
        xPct: x / width,
        anchorY: -80,
        segments: segmentsForRank(rank, rng),
        color: color ?? PALETTE[Math.floor(rng() * PALETTE.length)],
        layer,
        skillIcon,
        isSkeleton,
      });
    }
  }

  // 3. Render order: back to front.
  flasks.sort((a, b) => b.layer - a.layer);
  return flasks;
}

// Mobile keeps a row-based layout: anchors distributed DOWN the height in rows
// (a narrow/tall phone needs vertical distribution). Reuses the same data
// pipeline — priority, seed, plain-flask overflow.
function generateMobileField(args: Args): FlaskConfig[] {
  const { width, height, skills, seed, config } = args;
  const rng = mulberry32(seed);
  const sorted = [...skills].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

  const numRows = 3;
  const perRow = Math.max(1, Math.floor(width / config.flaskSpacingX));
  const rowHeight = height / numRows;
  const flasks: FlaskConfig[] = [];
  let skillIdx = 0;

  for (let row = 0; row < numRows; row++) {
    const layer = row; // top row = front
    const isSkeleton = layer >= config.columnCount - config.skeletonBands;
    const anchorY = row * rowHeight - 80;
    const placedX: number[] = [];

    for (let s = 0; s < perRow; s++) {
      const x = sampleX(width, config.flaskSpacingX, placedX, rng);
      if (x < 0) break;
      placedX.push(x);

      let skillIcon: string | undefined;
      let color: string | undefined;
      if (!isSkeleton && skillIdx < sorted.length) {
        skillIcon = sorted[skillIdx].svgPath;
        color = sorted[skillIdx].color;
        skillIdx++;
      }

      flasks.push({
        xPct: x / width,
        anchorY,
        segments: 2 + Math.floor(rng() * 3), // short chains on mobile
        color: color ?? PALETTE[Math.floor(rng() * PALETTE.length)],
        layer,
        skillIcon,
        isSkeleton,
      });
    }
  }

  flasks.sort((a, b) => b.layer - a.layer);
  return flasks;
}
