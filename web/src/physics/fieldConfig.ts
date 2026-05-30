import { LAYER_SCALE, MAX_PHYSICS_SEGMENTS } from "./constants";
import type { GraphicsTier } from "@/lib/outro/tiers";

export interface FieldConfig {
  /** Total flasks to attempt to place. */
  flaskCount: number;
  /** Max simulated (physics) flasks; overflow becomes skeletons. */
  maxPhysicsFlasks: number;
  /** Per-chain cap on simulated links. Links above this in one chain are
   *  drawn as a static rope. `Number.POSITIVE_INFINITY` simulates every link. */
  maxPhysicsSegments: number;
  /** Scale per tier, front → back. Length === tier count. */
  layerScale: readonly number[];
  /** The back N tiers are skeletons (static, no physics, no icon). */
  skeletonBands: number;
  /** [min, max] chain segment count. */
  segmentRange: [number, number];
  /** Desktop spread vs mobile column. */
  layout: "field" | "column";
  /** Desktop only: extra decorative back-tier skeletons scattered across the
   *  full height (incl. the upper "first view") so depth sits behind the
   *  interactive flasks everywhere, not just along the bottom. */
  bgSkeletons?: number;
  /** Desktop only: a few LARGE foreground skeletons dropped over the densest
   *  chain "beams" to break up the rope tangle. Painted in front of everything. */
  coverSkeletons?: number;
}

// Desktop "medium" baseline; tier presets below derive from it.
export const DESKTOP_DEFAULT: FieldConfig = {
  flaskCount: 30,
  maxPhysicsFlasks: 18,
  maxPhysicsSegments: MAX_PHYSICS_SEGMENTS,
  layerScale: LAYER_SCALE,
  skeletonBands: 2,
  // maxSeg is high enough that the deepest chains reach the bottom of a tall
  // (≈1080p) section, so the rack fills top-to-bottom (depth back-solves the
  // chain length now). Extra links above the physics cap are cheap static rope.
  segmentRange: [3, 16],
  layout: "field",
  bgSkeletons: 24, // small ghosts filling depth behind the rack at ALL heights (incl. middle)
  coverSkeletons: 14, // varied flasks (big & small) hung behind the rack from the surface into the upper-middle band
};

// Mobile: tier 0 = interactive column; tiers 1..2 = background skeleton planes.
// A denser column with longer chains so there's plenty to grab/swing.
export const MOBILE_CONFIG: FieldConfig = {
  flaskCount: 42, // 32 skill flasks (scatter) + ~10 background decorative skeletons
  // Every skill flask is interactive/draggable (was 8). Background decorative
  // skeletons stay static. FUTURE: to claw back FPS on low-end phones, keep
  // skill flasks static and lazily promote only the dragged one + its immediate
  // neighbours to physics on touch (see useMousePhysics).
  maxPhysicsFlasks: 36,
  maxPhysicsSegments: MAX_PHYSICS_SEGMENTS,
  layerScale: [0.56, 0.38, 0.28], // small so all skills pack densely & compactly
  skeletonBands: 2,
  segmentRange: [2, 24], // short top chains (small gap) → long deep ones; skeleton-cheap
  layout: "column",
};

// Desktop flask field per graphics tier (shares the site-wide GraphicsTier so
// one setting controls both this rack and the underwater outro).
//   off    → fully static rack: maxPhysicsFlasks 0 makes every flask a
//            skeleton (no physics, no rAF). This is also how reduced-motion is
//            honoured, since useGraphicsTier maps reduced-motion → "off".
//   low    → light: fewer foreground tiers, more skeleton depth, short chains.
//   medium → default.
//   high   → full field, more foreground tiers.
// NOTE: on desktop EVERY foreground icon flask is interactive (physics) except
// when motion is off — maxPhysicsFlasks no longer caps icon flasks here, it only
// matters as the 0 = static sentinel. bgSkeletons add static depth behind.
export const FIELD_BY_TIER: Record<GraphicsTier, FieldConfig> = {
  off: { flaskCount: 24, maxPhysicsFlasks: 0, maxPhysicsSegments: MAX_PHYSICS_SEGMENTS, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 16], layout: "field", bgSkeletons: 18, coverSkeletons: 8 },
  low: { flaskCount: 26, maxPhysicsFlasks: 8, maxPhysicsSegments: MAX_PHYSICS_SEGMENTS, layerScale: LAYER_SCALE, skeletonBands: 3, segmentRange: [3, 13], layout: "field", bgSkeletons: 18, coverSkeletons: 8 },
  medium: { ...DESKTOP_DEFAULT, maxPhysicsFlasks: 18, skeletonBands: 2 },
  // maxPhysicsSegments was Infinity (whole chain simulated). That made a
  // released chain wake + DOM-update ALL its links every frame — the visible
  // "let go" spike. Cap at 8: only the bottom 8 links swing (a chain's top
  // barely moves anyway), the rest are static rope. Big drop in awake bodies +
  // per-frame transform writes for a near-identical look.
  high: { flaskCount: 44, maxPhysicsFlasks: 26, maxPhysicsSegments: 8, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 16], layout: "field", bgSkeletons: 32, coverSkeletons: 18 },
};

/** Pick the flask field config for the resolved tier + device. Mobile keeps the
 *  column layout; "off" forces a fully static rack on either. */
export function fieldConfigFor(tier: GraphicsTier, isMobile: boolean): FieldConfig {
  if (isMobile) {
    return tier === "off" ? { ...MOBILE_CONFIG, maxPhysicsFlasks: 0 } : MOBILE_CONFIG;
  }
  return FIELD_BY_TIER[tier];
}
