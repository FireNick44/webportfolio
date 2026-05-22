export interface SkillEntry {
  id: string;
  name: string;
  svgPath: string;
  color?: string; // optional liquid color; falls back to palette
  priority?: number; // higher = more prominent (front band + higher hang)
}

export interface LayoutConfig {
  columnCount: number; // total depth bands
  skeletonBands: number; // how many back bands are non-physics
  flaskSpacingX: number; // px: density knob + min horizontal spacing
  minFlasks: number;
  maxFlasks: number;
  maxPhysicsFlasks: number; // body budget for dynamic flasks
}

export interface FlaskConfig {
  xPct: number; // 0..1 horizontal fraction (anchorX = xPct * width)
  anchorY: number; // absolute px (top-anchored desktop; row offset mobile)
  segments: number;
  color: string;
  layer: number; // depth band index (0 = front)
  skillIcon?: string;
  isSkeleton: boolean; // true => no physics, no interaction, positioned once
}
