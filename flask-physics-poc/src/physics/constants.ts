export const CHAIN_SEGMENT_COUNT = 8;
export const CHAIN_SEGMENT_WIDTH = 26;
export const CHAIN_SEGMENT_HEIGHT = 60;
export const CHAIN_STIFFNESS = 0.92;
export const CHAIN_DAMPING = 0.45;

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

export const MOUSE_BODY_RADIUS = 7;

// Depth layers
export const DEPTH_LAYERS = 3;
export const CAT_LAYER = [0x0002, 0x0004, 0x0008] as const;
export const CAT_CHAIN = 0x0040;
export const CAT_MOUSE = 0x0010;
export const CAT_WALL = 0x0020;

export const CHAIN_FILTER = { category: CAT_CHAIN, mask: 0 };

export function layerFilter(layer: number) {
  const cat = CAT_LAYER[layer];
  return {
    category: cat,
    mask: layer === 2 ? cat | CAT_WALL : cat | CAT_MOUSE | CAT_WALL,
  };
}

export const MOUSE_MASK = CAT_LAYER[0] | CAT_LAYER[1];

export const WALL_FILTER = {
  category: CAT_WALL,
  mask: CAT_LAYER[0] | CAT_LAYER[1] | CAT_LAYER[2],
};

// Visual depth (front → back): same opacity, only scale changes
export const DEPTH_SCALE = [1.0, 0.8, 0.6] as const;
export const DEPTH_OPACITY = [1.0, 1.0, 1.0] as const;

export const MIN_SAME_LAYER_DISTANCE_PCT = 0.07;
export const MOBILE_BREAKPOINT = 768;
export const MAX_LIQUID_TILT_DEG = 25;

// --- Layout (depth bands + density) ---
export const COLUMN_COUNT = 3; // total depth bands
export const SKELETON_BANDS = 1; // back bands with no physics
export const FLASK_SPACING_X = 150; // px: density knob + min horizontal gap
export const MIN_FLASKS = 8;
export const MAX_FLASKS = 70;
export const MAX_PHYSICS_FLASKS = 36; // body budget for dynamic flasks

export const MIN_FLASK_SEGMENTS = 3;
export const MAX_FLASK_SEGMENTS = 14;

// --- Mouse / shake / friction ---
export const FLASK_FRICTION = 0.4; // contact friction (was 0: pure frictionAir)
export const SHAKE_IMPULSE = 0.9; // horizontal velocity injected on hit (px/step)
export const SHAKE_COOLDOWN_MS = 450; // per-flask re-trigger lockout
export const ENGINE_WAKE_MS = 600; // how long mousemove keeps the engine live
