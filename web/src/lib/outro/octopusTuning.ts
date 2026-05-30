// Tuning constants + favourite-spot picker for the cursor-aware octopus.
// All pure: no React, no DOM. The motion solver in Octopus.tsx reads these
// to drive its damped-spring chase + mood transitions. Lifted out of the
// component so the file stays focused on lifecycle + render.

export const DAMP = 2.4;
export const SPRING = 1.5; // gentler pull to the spot → eases in, doesn't dart
export const AVOID_R = 340;
export const AVOID_FORCE = 5200;
export const PERSONAL_R = 185; // approach this close and he backs off
export const PERSONAL_FORCE = 4600;
export const SCARE_GAIN = 0.9; // scare/sec accrued while fleeing
export const SCARE_DECAY = 0.6;
export const SCARE_TRIGGER = 1.4;
export const HIDE_MIN = 7000;
export const HIDE_RAND = 4000;
export const ORBIT_R = 200; // curious orbit sits just outside personal-space gap
export const ORBIT_SPEED = 2.0;
export const ORBIT_K = 3.2;
export const MIN_GAP = 118; // hard floor: never closer than this to the cursor

// Mood-based speed caps (px/s): calm orbit < wary avoid < panicked flee.
export const SPEED_ORBIT = 540;
export const SPEED_WARY = 520; // roam travel cap — calmer, no zipping
export const SPEED_FLEE = 1040;
export const SPEED_DASH = 1320; // brief burst after inking

export const TAU = Math.PI * 2;

// Favourite hangouts (fractions of the scene) the octopus drifts between when
// it isn't reacting to the cursor — weighted so it has habits, not pure
// randomness.
export const SPOTS: { x: number; y: number; w: number }[] = [
  { x: 0.24, y: 0.74, w: 4 }, // tucked behind the front kelp
  { x: 0.05, y: 0.6, w: 3 }, //  lurking at the left edge
  { x: 0.95, y: 0.6, w: 3 }, //  lurking at the right edge
  { x: 0.5, y: 0.56, w: 1 }, //  open water (rarely)
  { x: 0.72, y: 0.72, w: 1 }, //  sand, right of centre
];
const SPOT_TOTAL = SPOTS.reduce((sum, p) => sum + p.w, 0);

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Weighted pick of a favourite spot, with a little jitter so it's never exact. */
export function pickSpot(W: number, H: number): { x: number; y: number } {
  let r = Math.random() * SPOT_TOTAL;
  let spot = SPOTS[0];
  for (const p of SPOTS) {
    r -= p.w;
    if (r <= 0) {
      spot = p;
      break;
    }
  }
  return {
    x: clamp(spot.x + (Math.random() - 0.5) * 0.12, 0.02, 0.98) * W,
    y: clamp(spot.y + (Math.random() - 0.5) * 0.1, 0.45, 0.85) * H,
  };
}
