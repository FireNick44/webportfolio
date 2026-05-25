// Cursor-reaction model for the outro octopus: he is always cursor-aware, but
// only *flees* a genuine lunge — a calm/placed cursor makes him curious instead.

export type OctoMode = "roam" | "curious" | "flee";

export const CALM_SPEED = 250; // px/s: at/below this the cursor reads as "calm/placed"
export const LUNGE_SPEED = 900; // px/s: above this AND closing = a lunge
export const FLEE_EXIT_SPEED = 300; // must drop below this to consider leaving flee
export const FLEE_EXIT_MS = 400; // ...and stay below it this long
export const CURIOUS_R = 360; // a calm cursor within this radius → curious
export const COMFORT_R = 135; // orbit radius he keeps while curious

/** EMA-smooth a noisy per-frame speed sample so a placed cursor decays to ~0. */
export function smoothSpeed(prev: number, sample: number, alpha = 0.2): number {
  return prev + (sample - prev) * alpha;
}

export interface ModeInput {
  cActive: boolean; // pointer present in the scene
  cspeed: number; // EMA cursor speed (px/s)
  dist: number; // distance octopus→cursor (px)
  closing: boolean; // cursor getting closer this frame
  calmMs: number; // how long cspeed has stayed below FLEE_EXIT_SPEED
}

/** Hysteresis state machine — separate enter/exit thresholds so he never
 *  chatters at a boundary. While already curious he's harder to spook (a small
 *  nudge during the "courtship" shouldn't shatter it), so the lunge threshold
 *  is raised 30%. */
export function nextMode(mode: OctoMode, i: ModeInput): OctoMode {
  if (!i.cActive) return mode === "flee" ? "roam" : mode === "curious" ? "roam" : mode;

  if (mode === "flee") {
    if (i.cspeed < FLEE_EXIT_SPEED && i.calmMs >= FLEE_EXIT_MS) {
      return i.dist < CURIOUS_R && i.cspeed < CALM_SPEED ? "curious" : "roam";
    }
    return "flee";
  }

  const lungeT = mode === "curious" ? LUNGE_SPEED * 1.3 : LUNGE_SPEED;
  if (i.closing && i.cspeed > lungeT && i.dist < CURIOUS_R) return "flee";
  if (mode === "curious") {
    // Sticky: stay curious while the cursor lingers in range — a moderate nudge
    // shouldn't break it. Only a lunge (above) or the cursor leaving range drops it.
    return i.dist < CURIOUS_R ? "curious" : "roam";
  }
  if (i.cspeed < CALM_SPEED && i.dist < CURIOUS_R) return "curious";
  return "roam";
}
