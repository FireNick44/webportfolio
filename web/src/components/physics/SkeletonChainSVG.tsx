import { CHAIN_SEGMENT_WIDTH, chainLength } from "@/physics/constants";

import {
  CAP_W,
  CAP_H,
  BAR_W,
  BAR_H,
  BAR_OVERLAP,
  BAR_OVERHANG,
  CAP_PERIOD,
  BOTTOM_BAR_OVERHANG,
  donutCapPath,
  bottomBarPath,
} from "./chainArt";

/**
 * A whole STATIC skeleton chain rendered as ONE <svg> instead of N per-link
 * ChainLinkSVG wrappers. Skeletons never move, so there's no reason to pay for
 * N wrapper <div>s + N nested <svg>s — collapsing them to a single node cuts
 * the rack's DOM node count by ~8× (one continuous svg per skeleton), which
 * shrinks style-recalc scope, the compositor layer tree, and mount/paint cost.
 *
 * Pixel-identical to the per-link version by construction: a chain's links
 * tile on a fixed CAP_PERIOD (40px) grid (chainLength === sum of segment
 * heights === M·40), so the chain is just M contiguous units regardless of how
 * the physics segmentation groups them. The cap/bar geometry + gradient refs
 * are the SAME ones ChainLinkSVG uses (gradients are objectBoundingBox, i.e.
 * per-shape, so merging containers doesn't change shading). Positioned once by
 * FlaskChain (anchor + per-layer scale); the bar count/paths are unchanged, so
 * this is a DOM-node win, not a paint-element win.
 */
export default function SkeletonChainSVG({ segments }: { segments: number }) {
  const w = CHAIN_SEGMENT_WIDTH;
  const H = chainLength(segments); // unscaled total length === M · CAP_PERIOD
  const M = Math.max(1, Math.round(H / CAP_PERIOD));
  const capX = (w - CAP_W) / 2;
  const barX = (w - BAR_W) / 2;
  const svgH = H + BAR_OVERHANG + BOTTOM_BAR_OVERHANG;

  // M contiguous units, bottom-up (j=0 = bottommost cap). capY/barTop match
  // ChainLinkSVG's per-unit maths exactly; the topmost unit's bar overhangs the
  // chain top by BAR_OVERHANG (it tucks behind the wave like the physics chains).
  const units = Array.from({ length: M }, (_, j) => {
    const capY = H - CAP_H - j * CAP_PERIOD;
    const isTop = j === M - 1;
    const barBottom = capY + BAR_OVERLAP;
    const barTop = isTop ? -BAR_OVERHANG : barBottom - BAR_H;
    return { capY, barTop, barBottom };
  });

  return (
    <svg
      width={w}
      height={svgH}
      viewBox={`0 ${-BAR_OVERHANG} ${w} ${svgH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: -BAR_OVERHANG,
        left: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {/* All caps first (z-back, donut rings). */}
      {units.map((u, i) => (
        <path
          key={`cap-${i}`}
          d={donutCapPath(capX, u.capY)}
          fillRule="evenodd"
          fill="url(#chain-cap-grad)"
          stroke="#364c61"
          strokeWidth={1}
        />
      ))}
      {/* All connector bars after the caps (z-front). */}
      {units.map((u, i) => (
        <rect
          key={`bar-${i}`}
          x={barX}
          y={u.barTop}
          width={BAR_W}
          height={u.barBottom - u.barTop}
          rx={3}
          ry={3}
          fill="url(#chain-bar-grad)"
          stroke="#475f75"
          strokeWidth={1}
        />
      ))}
      {/* Bottommost partial bar — the tail entering the flask cork. */}
      <path
        d={bottomBarPath(barX, H)}
        fill="url(#chain-bar-grad)"
        stroke="#475f75"
        strokeWidth={1}
      />
    </svg>
  );
}
