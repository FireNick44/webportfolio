export const CHAIN_SEGMENT_COUNT = 8;
export const CHAIN_SEGMENT_WIDTH = 26;
export const CHAIN_SEGMENT_HEIGHT = 60;
// Stiff, lightly-damped joints — matter-js's smooth "ropeC" feel (stiffness 1,
// length 0). The old 0.92 / 0.45 read as a chompy, over-damped zig-zag.
export const CHAIN_STIFFNESS = 1;
export const CHAIN_DAMPING = 0.1;

// Skeleton chains: only the bottom MAX_PHYSICS_SEGMENTS links of a chain are
// simulated; any links above that are drawn as a static rope down to the pin.
// Keeps long chains (especially mobile) cheap — a 20-link chain costs ~6 bodies,
// and only the bottom near the flask swings.
export const MAX_PHYSICS_SEGMENTS = 6;

// Top segments are taller to reduce body count
export const CHAIN_HEIGHT_MULTIPLIERS = [2.0, 2.0, 1.5, 1.5];

export function getSegmentHeight(index: number): number {
  if (index < CHAIN_HEIGHT_MULTIPLIERS.length) {
    return CHAIN_SEGMENT_HEIGHT * CHAIN_HEIGHT_MULTIPLIERS[index];
  }
  return CHAIN_SEGMENT_HEIGHT;
}

// --- Chain geometry (overlap-aware), single source of truth -----------------
// Where each joint connects, as a fraction of a segment's height from its centre:
//   0.5  = links touch end-to-end
//   <0.5 = links overlap (hides joints; reads as a continuous rope)
//   >0.5 = a visible GAP between links (reads as a distinct-link chain)
// Stiffness 1 + low damping (above) keep it from zig-zagging at any spacing.
export const JOINT_INSET = 0.53;

/** Centre-to-centre advance from link i to i+1 (variable heights, overlap-aware). */
export function segmentAdvance(i: number): number {
  return JOINT_INSET * (getSegmentHeight(i) + getSegmentHeight(i + 1));
}

/** Vertical centre of chain link i, measured down from the chain's top anchor. */
export function linkCenterOffset(i: number): number {
  let y = getSegmentHeight(0) / 2;
  for (let k = 0; k < i; k++) y += segmentAdvance(k);
  return y;
}

/** Anchor → bottom of the last segment (where the flask attaches), overlap-aware. */
export function chainLength(segments: number): number {
  if (segments <= 0) return 0;
  return linkCenterOffset(segments - 1) + getSegmentHeight(segments - 1) / 2;
}

/** Smallest segment count whose chain reaches at least `len` px. */
export function segmentsForLength(len: number): number {
  let n = 1;
  while (n < 128 && chainLength(n) < len) n++;
  return n;
}

// Visual flask size vs physics hitbox
export const FLASK_WIDTH = 120;
export const FLASK_HEIGHT = 192;
export const FLASK_HITBOX_WIDTH = 75;
export const FLASK_HITBOX_HEIGHT = 145;

// Depth layers
export const DEPTH_LAYERS = 3;
export const CAT_LAYER = [0x0002, 0x0004, 0x0008] as const;
export const CAT_CHAIN = 0x0040;
export const CAT_MOUSE = 0x0010;
export const CAT_WALL = 0x0020;

export const CHAIN_FILTER = { category: CAT_CHAIN, mask: 0 };

export function layerFilter(layer: number) {
  const idx = Math.min(layer, CAT_LAYER.length - 1);
  const cat = CAT_LAYER[idx];
  return { category: cat, mask: cat | CAT_MOUSE | CAT_WALL };
}

export const WALL_FILTER = {
  category: CAT_WALL,
  mask: CAT_LAYER[0] | CAT_LAYER[1] | CAT_LAYER[2],
};

// Per-tier visual+physics scale, front → back. Length defines the desktop tier
// count. Single source of truth for size at each depth.
export const LAYER_SCALE = [1.0, 0.82, 0.66, 0.5, 0.36] as const;

export const MIN_SAME_LAYER_DISTANCE_PCT = 0.07;
// Flasks are kept from stacking by a 2D check on their (scaled) body boxes —
// this padding scales the required centre-to-centre gap. <1 tolerates a little
// edge overlap (reads as depth); ≥1 forces a full gap. Cross-layer chains may
// still cluster at varied x; only the actual bodies are kept apart, so the rack
// no longer reads as an even comb.
export const BODY_OVERLAP_PAD = 0.9;

// The lowest a chain's TOP anchor may sit and still tuck behind the top
// WaveDivider (which masks ~the top 50-70px). generateFlasks keeps every chain
// top at/above this (see solveChain → HIDDEN_TOP) so no chain starts in mid-air.
export const TOP_LINE = {
  floorY: -64, // chain-top ceiling: at/above this stays hidden behind the wave
} as const;

export const MOBILE_BREAKPOINT = 768;
// Cap the flask field width on ultra-wide screens so flasks don't spread
// edge-to-edge forever; beyond this the rack is centred with side margins.
export const MAX_RACK_WIDTH = 1800;
export const MAX_LIQUID_TILT_DEG = 25;
