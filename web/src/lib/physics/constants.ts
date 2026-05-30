export const CHAIN_SEGMENT_COUNT = 8;
export const CHAIN_SEGMENT_WIDTH = 26;
// Base unit height: one cap + one bar = 40 px (the chain art's natural period,
// see ChainLinkSVG.tsx). Every segment height is a whole multiple of this so
// the art never stretches.
export const CHAIN_SEGMENT_HEIGHT = 40;
// Stiff, lightly-damped joints — matter-js's smooth "ropeC" feel (stiffness 1,
// length 0). The old 0.92 / 0.45 read as a chompy, over-damped zig-zag.
export const CHAIN_STIFFNESS = 1;
export const CHAIN_DAMPING = 0.1;

// Skeleton chains: only the bottom MAX_PHYSICS_SEGMENTS links of a chain are
// simulated; any links above that are drawn as a static rope down to the pin.
// Keeps long chains (especially mobile) cheap — a 20-link chain costs ~6 bodies,
// and only the bottom near the flask swings.
export const MAX_PHYSICS_SEGMENTS = 6;

// Segment-height profile is COUNT-AWARE and measured from the BOTTOM, so a chain
// reads as a heavy rope up top thinning to a few small links at the flask:
//   • the bottom CHAIN_SINGLE_TAIL segments are single units (40 px) — the thin
//     tail by the flask;
//   • above them each segment grows one unit taller, capped at CHAIN_MAX_UNITS
//     (240 px = 6 units).
// This packs many art units into few Matter bodies — a deep chain that needed
// ~52 single (40 px) segments before now needs ~16, slashing DOM wrappers +
// compositor layers (the actual FPS cost), and it kills the long run of single
// segments at the bottom that looked wrong.
export const CHAIN_SINGLE_TAIL = 2;
export const CHAIN_MAX_UNITS = 6;

/** Height of segment `index` in a chain of `count` segments (index 0 = top,
 *  nearest the anchor; count-1 = bottom, nearest the flask). */
export function getSegmentHeight(index: number, count: number): number {
  const d = count - 1 - index; // distance from the bottom (0 = bottom-most)
  if (d < CHAIN_SINGLE_TAIL) return CHAIN_SEGMENT_HEIGHT;
  const units = Math.min(CHAIN_MAX_UNITS, d - CHAIN_SINGLE_TAIL + 2);
  return units * CHAIN_SEGMENT_HEIGHT;
}

// --- Chain geometry (overlap-aware), single source of truth -----------------
// Where each joint connects, as a fraction of a segment's height from its centre:
//   0.5  = links touch end-to-end
//   <0.5 = links overlap (hides joints; reads as a continuous rope)
//   >0.5 = a visible GAP between links (reads as a distinct-link chain)
// Stiffness 1 + low damping (above) keep it from zig-zagging at any spacing.
// MUST be 0.5 now: the cap art tiles at a fixed 40px rhythm WITHIN each segment
// (7px between caps). Any value >0.5 adds a body-edge gap that scales with
// segment height — for the tall top segments that was ~21px at the seam vs 7px
// within, the visible "gap where chains connect". 0.5 makes segment edges touch
// so the seam gap equals the within-segment 7px → uniform rhythm end to end.
export const JOINT_INSET = 0.5;

/** Centre-to-centre advance from link i to i+1 (variable heights, overlap-aware). */
export function segmentAdvance(i: number, count: number): number {
  return (
    JOINT_INSET * (getSegmentHeight(i, count) + getSegmentHeight(i + 1, count))
  );
}

/** Vertical centre of chain link i, measured down from the chain's top anchor. */
export function linkCenterOffset(i: number, count: number): number {
  let y = getSegmentHeight(0, count) / 2;
  for (let k = 0; k < i; k++) y += segmentAdvance(k, count);
  return y;
}

/** Anchor → bottom of the last segment (where the flask attaches), overlap-aware. */
export function chainLength(segments: number): number {
  if (segments <= 0) return 0;
  return (
    linkCenterOffset(segments - 1, segments) +
    getSegmentHeight(segments - 1, segments) / 2
  );
}

/** Smallest segment count whose chain reaches at least `len` px. Monotonic:
 *  more segments ⇒ longer chain (extra segment + the existing ones each grow a
 *  unit as `count` rises), so a linear scan finds the answer. */
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

// Gap (full-scale px) between the chain's bottom segment and the flask, so the
// chain's bottommost connector "tail" stays clearly visible instead of being
// swallowed by the cork (the cork sits at the very TOP of the flask box,
// flaskShapes cork.y=0, so it overlaps the chain area — the gap has to clear
// FLASK_HEIGHT/2 − FLASK_HITBOX_HEIGHT/2 ≈ 23.5px before any tail shows).
// Scaled per layer where applied. The flask SVG is centered in its box
// (preserveAspectRatio xMidYMid meet), so the cork sits ~18.8px BELOW the box
// top for round/rect (cone ~0). Net cork position ≈ chain_end + (gap − 4.7).
// 14 lands the cork ~9px below the chain end; the bottom tail (overhang 18)
// reaches past that and overlaps the cork, so there's no gap. Bigger values
// (e.g. the old 24) drop the cork below the short tail → visible gap.
export const FLASK_CHAIN_GAP = 14;

// Depth layers
export const DEPTH_LAYERS = 3;
export const CAT_LAYER = [0x0002, 0x0004, 0x0008] as const;
export const CAT_MOUSE = 0x0010;
export const CAT_WALL = 0x0020;
// Chain segments live in their own category so they collide with same-layer
// FLASKS (via the flask's mask) but never with OTHER CHAINS — putting both
// chains in the same layer category produced a noisy flicker as two anchored
// rope solvers fought each other along their shared overlap. Chain-flask
// collisions still feel like a chain "draping around" a flask because matter
// resolves the per-segment hit normally; we just dropped the chain↔chain
// fight that wasn't doing visual work.
export const CAT_CHAIN = 0x0040;

export function layerFilter(layer: number) {
  const idx = Math.min(layer, CAT_LAYER.length - 1);
  const cat = CAT_LAYER[idx];
  // Flasks collide with: same-layer flasks (cat), the mouse drag system, the
  // bounding walls, AND any chain (CAT_CHAIN). The chain category is layerless
  // — the chain's OWN mask is what gates chain-vs-flask to same-layer only.
  return { category: cat, mask: cat | CAT_MOUSE | CAT_WALL | CAT_CHAIN };
}

/** Chain segments use their own category (CAT_CHAIN, not the layer) so two
 *  chains never push each other — that was the visible flicker. Their mask
 *  includes only the same-layer flask category + walls, which is what gates
 *  chain-vs-flask to "same layer only". Mouse is omitted from the mask so the
 *  drag system grabs flasks first; chain links remain grabbable via
 *  Matter.Query.point in useMousePhysics (ignores collision filters).
 *
 *  The negative `group` is unique per chain instance — matching negative
 *  groups never collide, which keeps a chain's segments + its own flask from
 *  fighting each other (necessary because flasks already collide with
 *  CAT_CHAIN through the rule above, and that would otherwise hit the chain
 *  the flask is hanging from). */
export function chainCollisionFilter(layer: number, group: number) {
  const idx = Math.min(layer, CAT_LAYER.length - 1);
  const layerCat = CAT_LAYER[idx];
  return { category: CAT_CHAIN, mask: layerCat | CAT_WALL, group };
}

// Module-scoped counter for unique chain groups. Negative ints, never reset
// within a session — every FlaskChain instance grabs the next one on mount.
let nextChainGroup = -1;
export function newChainGroup(): number {
  return nextChainGroup--;
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
