import { LAYER_SCALE } from "./constants";

export interface FieldConfig {
  /** Total flasks to attempt to place. */
  flaskCount: number;
  /** Max simulated (physics) flasks; overflow becomes skeletons. */
  maxPhysicsFlasks: number;
  /** Scale per tier, front → back. Length === tier count. */
  layerScale: readonly number[];
  /** The back N tiers are skeletons (static, no physics, no icon). */
  skeletonBands: number;
  /** [min, max] chain segment count. */
  segmentRange: [number, number];
  /** Desktop spread vs mobile column. */
  layout: "field" | "column";
}

// Lean desktop default (Phase 1). Quality presets replace this later.
export const DESKTOP_DEFAULT: FieldConfig = {
  flaskCount: 30,
  maxPhysicsFlasks: 18,
  layerScale: LAYER_SCALE,
  skeletonBands: 2,
  segmentRange: [3, 11],
  layout: "field",
};

// Mobile: tier 0 = interactive column; tiers 1..2 = background skeleton planes.
export const MOBILE_CONFIG: FieldConfig = {
  flaskCount: 8, // ~4 foreground + ~4 background skeletons
  maxPhysicsFlasks: 4,
  layerScale: [1.0, 0.5, 0.36],
  skeletonBands: 2,
  segmentRange: [4, 5],
  layout: "column",
};

export type Quality = "low" | "medium" | "high";

export const QUALITY_PRESETS: Record<Quality, FieldConfig> = {
  low: { flaskCount: 26, maxPhysicsFlasks: 8, layerScale: LAYER_SCALE, skeletonBands: 3, segmentRange: [3, 7], layout: "field" },
  medium: { ...DESKTOP_DEFAULT, maxPhysicsFlasks: 18, skeletonBands: 2 },
  // high's flaskCount is sized so the 3 physics tiers hold >22 slots → a few
  // empty-but-interactive flasks appear once the 22 skills run out.
  high: { flaskCount: 44, maxPhysicsFlasks: 26, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 11], layout: "field" },
};

export interface DeviceSignals {
  cores: number;
  memory: number; // GB; use 8 when unknown
  prefersReducedMotion: boolean;
  isMobile: boolean;
}

export function resolveQuality(s: DeviceSignals): Quality {
  if (s.prefersReducedMotion) return "low";
  let q: Quality = s.cores < 4 ? "low" : s.cores <= 8 ? "medium" : "high";
  if (q === "high" && s.memory < 4) q = "medium"; // low RAM caps it
  return q;
}

const ORDER: Quality[] = ["low", "medium", "high"];
export function applyFpsDowngrade(q: Quality, fps: number, threshold = 45): Quality {
  if (fps >= threshold) return q;
  const i = ORDER.indexOf(q);
  return ORDER[Math.max(0, i - 1)];
}
