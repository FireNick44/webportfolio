// Tap classification + annoyance tuning for the outro octopus.

export const INK_HIT_R = 70; // tap within this of the mass-centre = "on him"
export const SCARE_TAP_R = 180; // tap within this (outside INK_HIT_R) = "around"
export const ANNOY_ON = 0.5; // meter add per on-him tap (2 → ink)
export const ANNOY_AROUND = 0.18; // meter add per around tap
export const ANNOY_INK = 1.0; // meter threshold to emit ink (mobile path)
export const ANNOY_DECAY = 0.35; // meter decay per second when left alone
export const INK_DROP = 30; // px below mass-centre = ink origin (his underside)
export const TAP_MAX_MS = 250; // tap vs scroll: max touch duration
export const TAP_MAX_MOVE = 10; // px: max movement to still count as a tap

export type TapClass = "on" | "around" | "miss";

/** A touch is a tap (not a scroll/drag) only if it was brief and barely moved. */
export function isTap(durationMs: number, movePx: number): boolean {
  return durationMs <= TAP_MAX_MS && movePx <= TAP_MAX_MOVE;
}

/** Classify a tap by its distance to the octopus mass-centre. */
export function classifyTap(dist: number): TapClass {
  if (dist <= INK_HIT_R) return "on";
  if (dist <= SCARE_TAP_R) return "around";
  return "miss";
}

/** Annoyance the octopus gains from a tap of the given class. */
export function annoyForTap(cls: TapClass): number {
  if (cls === "on") return ANNOY_ON;
  if (cls === "around") return ANNOY_AROUND;
  return 0;
}
