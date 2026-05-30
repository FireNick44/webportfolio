/**
 * Shared chain-link art: the natural-size cap/bar geometry pulled from the
 * source SVG, plus the two path builders. Consumed by both the per-link
 * ChainLinkSVG (physics chains) and the flattened SkeletonChainSVG (static
 * skeleton chains) so the two render paths can never drift apart.
 *
 * Blueprint unit (CAP_PERIOD = 40 px tall, never stretched):
 *   • cap: 29 × 33 donut (fillRule=evenodd cuts the inner pill out as a hole)
 *   • bar: 9 × 29, sits ABOVE the cap and overlaps it from the top by 11 px
 */

// Cap (the donut ring at the link's position).
export const CAP_W = 29;
export const CAP_H = 33;
// Outer corner radius (rounded-rect with visible straight edges; ~12px arc).
export const CAP_R = 12;
// Inset of the inner pill (the donut "hole") from the outer pill.
export const CAP_HOLE_INSET_X = 5;
export const CAP_HOLE_INSET_Y = 6;

// Connector bar — one per unit, at the source SVG's natural 9 × 29 size.
export const BAR_W = 9;
export const BAR_H = 29;
// How far the bar overlaps INTO the cap above (and into its OWN cap from the
// top). Same value both ends keeps the chain visually symmetric.
export const BAR_OVERLAP = 11;
// Topmost unit's bar overhangs ABOVE the segment by this much so it enters the
// cap of the link above through ITS donut hole.
export const BAR_OVERHANG = BAR_OVERLAP;

// Source-SVG-derived cap-to-cap distance. CHAIN_SEGMENT_HEIGHT is locked to a
// multiple of this so the chain always renders at natural density.
export const CAP_PERIOD = 40;

// Bottom-of-chain partial bar (the "tail" entering the flask cork).
export const BOTTOM_BAR_W = BAR_W;
export const BOTTOM_BAR_OVERLAP = 13;
export const BOTTOM_BAR_OVERHANG = 18;
export const BOTTOM_BAR_H = BOTTOM_BAR_OVERLAP + BOTTOM_BAR_OVERHANG; // 25, per source
export const BOTTOM_BAR_R = 3;

/** N = h / CAP_PERIOD. h is always a whole multiple by construction; the
 *  Math.round + clamp at 1 just defends against future tweaks that break the
 *  invariant (better to draw a stubby chain than crash). */
export function unitsForHeight(h: number): number {
  return Math.max(1, Math.round(h / CAP_PERIOD));
}

/** Donut cap path: outer rounded rect + inner rounded pill, both clockwise.
 *  Used with fillRule="evenodd" → the inner subpath cuts a hole, so a bar drawn
 *  behind the cap shows through this hole. */
export function donutCapPath(x: number, y: number): string {
  const cw = CAP_W - 1;
  const ch = CAP_H - 1;
  const ox = x + 0.5;
  const oy = y + 0.5;
  const R = CAP_R;
  // Inner pill — taller than wide, matching the source's vertical donut hole.
  const iw = cw - CAP_HOLE_INSET_X * 2;
  const ih = ch - CAP_HOLE_INSET_Y * 2;
  const iR = Math.min(iw, ih) / 2;
  const ix = ox + CAP_HOLE_INSET_X;
  const iy = oy + CAP_HOLE_INSET_Y;
  return (
    // Outer: start at top edge after the left corner, go clockwise.
    `M ${ox + R} ${oy}` +
    ` h ${cw - 2 * R}` +
    ` a ${R} ${R} 0 0 1 ${R} ${R}` +
    ` v ${ch - 2 * R}` +
    ` a ${R} ${R} 0 0 1 ${-R} ${R}` +
    ` h ${-(cw - 2 * R)}` +
    ` a ${R} ${R} 0 0 1 ${-R} ${-R}` +
    ` v ${-(ch - 2 * R)}` +
    ` a ${R} ${R} 0 0 1 ${R} ${-R} Z` +
    // Inner: same routine, smaller, clockwise. With evenodd this becomes a hole.
    ` M ${ix + iR} ${iy}` +
    ` h ${iw - 2 * iR}` +
    ` a ${iR} ${iR} 0 0 1 ${iR} ${iR}` +
    ` v ${ih - 2 * iR}` +
    ` a ${iR} ${iR} 0 0 1 ${-iR} ${iR}` +
    ` h ${-(iw - 2 * iR)}` +
    ` a ${iR} ${iR} 0 0 1 ${-iR} ${-iR}` +
    ` v ${-(ih - 2 * iR)}` +
    ` a ${iR} ${iR} 0 0 1 ${iR} ${-iR} Z`
  );
}

/** The bottommost partial bar — rounded TOP corners, flat bottom. Sits below
 *  cap 0 (overlapping it from below by BOTTOM_BAR_OVERLAP) and extends past the
 *  chain bottom by BOTTOM_BAR_OVERHANG into the flask's cork area. */
export function bottomBarPath(x: number, h: number): string {
  const r = BOTTOM_BAR_R;
  const topY = h - BOTTOM_BAR_OVERLAP;
  const innerW = BOTTOM_BAR_W - 2 * r;
  const innerH = BOTTOM_BAR_H - r;
  return (
    `M ${x + r} ${topY}` +
    ` h ${innerW}` +
    ` a ${r} ${r} 0 0 1 ${r} ${r}` +
    ` v ${innerH}` +
    ` h ${-BOTTOM_BAR_W}` +
    ` v ${-innerH}` +
    ` a ${r} ${r} 0 0 1 ${r} ${-r} Z`
  );
}
