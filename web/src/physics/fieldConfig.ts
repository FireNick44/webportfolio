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
