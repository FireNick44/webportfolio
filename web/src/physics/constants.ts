export const CHAIN_SEGMENT_COUNT = 8;
export const CHAIN_SEGMENT_WIDTH = 26;
export const CHAIN_SEGMENT_HEIGHT = 60;
export const CHAIN_STIFFNESS = 0.92;
export const CHAIN_DAMPING = 0.45;

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

// Visual flask size vs physics hitbox
export const FLASK_WIDTH = 120;
export const FLASK_HEIGHT = 192;
export const FLASK_HITBOX_WIDTH = 75;
export const FLASK_HITBOX_HEIGHT = 145;

export const MOUSE_BODY_RADIUS = 15;

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

export const MOUSE_MASK = CAT_LAYER[0] | CAT_LAYER[1] | CAT_LAYER[2];

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
export const BODY_OVERLAP_PAD = 0.85;

// Desktop "top line" variety. Flask anchors are spread WIDELY across the band
// below (not clustered on a line) so flasks don't hang in per-layer rows. The
// spread is upward-biased (more negative → higher → tucked behind the top
// WaveDivider, which only masks the top ~50-70px) since there's far more safe
// room above the wave than below it.
export const TOP_LINE = {
  spreadSkew: 0.85, // <1 leans the spread upward (toward the hidden ceiling)
  jitter: 14, // fine wobble on top of the spread
  ceilY: -180, // highest anchor (most negative / most hidden)
  floorY: -64, // lowest anchor (keeps chain-top behind the wave)
} as const;

export const MOBILE_BREAKPOINT = 768;
// Cap the flask field width on ultra-wide screens so flasks don't spread
// edge-to-edge forever; beyond this the rack is centred with side margins.
export const MAX_RACK_WIDTH = 1800;
export const MAX_LIQUID_TILT_DEG = 25;
