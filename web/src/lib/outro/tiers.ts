export type GraphicsTier = "off" | "low" | "medium" | "high";

export const TIER_ORDER: GraphicsTier[] = ["off", "low", "medium", "high"];

export interface TierEnv {
  reducedMotion: boolean;
  hasFinePointer: boolean;
}

/** Rank comparison: is `tier` at least `min`? */
export function atLeast(tier: GraphicsTier, min: GraphicsTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

/**
 * Resolve the *effective* tier from the user's selection and the device:
 * reduced-motion wins (→ off); touch devices cap at low (no cursor effects).
 */
export function resolveGraphicsTier(selected: GraphicsTier, env: TierEnv): GraphicsTier {
  if (env.reducedMotion) return "off";
  if (!env.hasFinePointer && atLeast(selected, "medium")) return "low";
  return selected;
}
