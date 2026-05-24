import { LAYER_SCALE } from "./constants";
import type { GraphicsTier } from "@/lib/outro/tiers";

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

// Desktop "medium" baseline; tier presets below derive from it.
export const DESKTOP_DEFAULT: FieldConfig = {
  flaskCount: 30,
  maxPhysicsFlasks: 18,
  layerScale: LAYER_SCALE,
  skeletonBands: 2,
  segmentRange: [3, 11],
  layout: "field",
};

// Mobile: tier 0 = interactive column; tiers 1..2 = background skeleton planes.
// A denser column with longer chains so there's plenty to grab/swing.
export const MOBILE_CONFIG: FieldConfig = {
  flaskCount: 32, // 22 skill flasks (scatter) + ~10 background decorative skeletons
  maxPhysicsFlasks: 8, // only these are interactive; the rest are static skill flasks
  layerScale: [0.62, 0.4, 0.3], // small so all skills pack densely, randomly scattered
  skeletonBands: 2,
  segmentRange: [4, 20], // long top-anchored chains; skeleton chains keep them cheap
  layout: "column",
};

// Desktop flask field per graphics tier (shares the site-wide GraphicsTier so
// one setting controls both this rack and the underwater outro).
//   off    → fully static rack: maxPhysicsFlasks 0 makes every flask a
//            skeleton (no physics, no rAF). This is also how reduced-motion is
//            honoured, since useGraphicsTier maps reduced-motion → "off".
//   low    → light: ~8 physics, more skeleton depth, shorter chains.
//   medium → today's default (~18 physics).
//   high   → full field (~26 physics; >22 means a few empty-but-interactive
//            flasks appear once the 22 skills run out).
export const FIELD_BY_TIER: Record<GraphicsTier, FieldConfig> = {
  off: { flaskCount: 24, maxPhysicsFlasks: 0, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 11], layout: "field" },
  low: { flaskCount: 26, maxPhysicsFlasks: 8, layerScale: LAYER_SCALE, skeletonBands: 3, segmentRange: [3, 7], layout: "field" },
  medium: { ...DESKTOP_DEFAULT, maxPhysicsFlasks: 18, skeletonBands: 2 },
  high: { flaskCount: 44, maxPhysicsFlasks: 26, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 11], layout: "field" },
};

/** Pick the flask field config for the resolved tier + device. Mobile keeps the
 *  column layout; "off" forces a fully static rack on either. */
export function fieldConfigFor(tier: GraphicsTier, isMobile: boolean): FieldConfig {
  if (isMobile) {
    return tier === "off" ? { ...MOBILE_CONFIG, maxPhysicsFlasks: 0 } : MOBILE_CONFIG;
  }
  return FIELD_BY_TIER[tier];
}
