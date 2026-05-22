export interface Ripple {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

/**
 * Push vector moving a point at (px,py) away from a cursor at (cx,cy).
 * Zero outside `radius`; scales linearly with closeness × `strength`.
 */
export function repel(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
  strength: number,
): { dx: number; dy: number } {
  const dx = px - cx;
  const dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius || d2 < 1e-6) return { dx: 0, dy: 0 };
  const d = Math.sqrt(d2);
  const f = (1 - d / radius) * strength;
  return { dx: (dx / d) * f, dy: (dy / d) * f };
}

/** Expand + fade a ripple ring by one timestep. */
export function advanceRipple(r: Ripple, dt: number, growth: number, fade: number): Ripple {
  return { x: r.x, y: r.y, r: r.r + growth * dt, alpha: r.alpha - fade * dt };
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
