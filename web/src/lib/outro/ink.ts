// Tap classification + ink tuning for the outro octopus.

export const INK_HIT_R = 70; // tap within this of the mass-centre = "on him"
export const SCARE_TAP_R = 180; // tap within this (outside INK_HIT_R) = "around"
export const INK_TAPS = 2; // on-taps within the window → ink
export const INK_WINDOW = 2500; // ms: how long an on-tap counts toward ink
export const INK_COOLDOWN = 1800; // ms: minimum gap between ink puffs
export const INK_DROP = 44; // px below mass-centre = ink origin (his lower middle)
export const INK_DASH_DELAY = 220; // ms: let the ink bloom, THEN he dashes away
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

/** True once at least INK_TAPS on-taps fall within INK_WINDOW ending at `now`.
 *  Deterministic ("click him twice quickly") — no decaying meter to fight. */
export function enoughOnTaps(times: number[], now: number): boolean {
  let recent = 0;
  for (const t of times) if (now - t <= INK_WINDOW) recent++;
  return recent >= INK_TAPS;
}
