import { forwardRef } from "react";

import { CHAIN_SEGMENT_WIDTH } from "@/physics/constants";

import {
  CAP_W,
  CAP_H,
  BAR_W,
  BAR_H,
  BAR_OVERLAP,
  BAR_OVERHANG,
  CAP_PERIOD,
  BOTTOM_BAR_OVERHANG,
  unitsForHeight,
  donutCapPath,
  bottomBarPath,
} from "./chainArt";

/**
 * One physics chain segment, rendered as N stacked BLUEPRINT UNITS — each unit
 * is one bar + one cap at the EXACT natural sizes pulled from the source SVG
 * (see chainArt.ts for the geometry + path builders, shared with the flattened
 * SkeletonChainSVG).
 *
 *   Each physics segment of height h gets N = h / 40 units stacked from the
 *   bottom up. h is invariantly a multiple of 40 (see getSegmentHeight, which
 *   only ever returns whole-unit multiples), so units pack exactly with no
 *   leftover gap or rubber-banded last bar:
 *
 *     h=40  → 1 unit         h=80  → 2 units        h=120 → 3 units
 *     ┌────┐                 ┌────┐                 ┌────┐
 *     │  ║ │ ← bar (29)      │  ║ │                 │  ║ │
 *     │ ┌║┐│                 │ ┌║┐│ ← cap (33)      │ ┌║┐│
 *     │ │║││ ← cap+bar hole  │ │║││                 │ │║││
 *     │ └║┘│                 │ └║┘│                 │ └║┘│
 *     └────┘                 │  ║ │ ← bar           │  ║ │
 *                            │ ┌║┐│                 │ ┌║┐│
 *                            │ │║││                 │ │║││
 *                            │ └║┘│                 │ └║┘│
 *                            └────┘                 │  ║ │
 *                                                   │ ┌║┐│
 *                                                   │ │║││
 *                                                   │ └║┘│
 *                                                   └────┘
 *
 * Paint order: ALL caps first (z-back), then ALL connector bars (z-front), so
 * every connector sits ON TOP of every circle — the shaft passes in front of
 * the ring, and the donut hole shows the page on either side of the bar.
 *
 * Gradients live in <ChainGradients /> at the scene root (#chain-cap-grad,
 * #chain-bar-grad). NO explicit z-index — links rely on DOM paint order.
 */
interface Props {
  id: string;
  segmentHeight: number;
  /** True only for the bottom-most chain link.
   *  Renders the extra partial connector bar below cap 0 — the chain-to-flask
   *  tail, matching the source SVG's paint40 (9 × 25, rounded top, flat
   *  bottom, overlaps the cap above by 13 px, extends 12 px below). */
  isBottommost: boolean;
  /** Whether this link's transform is updated per frame (physics-driven). Only
   *  animated links get `will-change: transform` — promoting a STATIC link to
   *  its own GPU compositor layer is pure waste, and the rack can have ~900
   *  static skeleton links, which tanks the framerate. */
  animated: boolean;
}

const ChainLinkSVG = forwardRef<HTMLDivElement, Props>(
  ({ id: _id, segmentHeight, isBottommost, animated }, ref) => {
    const w = CHAIN_SEGMENT_WIDTH;
    const h = segmentHeight;
    const n = unitsForHeight(h);

    const capX = (w - CAP_W) / 2;
    const barX = (w - BAR_W) / 2;

    // Build N blueprint units bottom-up. Each unit OWNS one cap (29 × 33 at
    // y = capY) AND one bar (9 × 29, sitting above the cap and overlapping it
    // from the top by BAR_OVERLAP). The TOP unit's bar instead overhangs above
    // the segment by BAR_OVERHANG so it enters the next physics segment up
    // through ITS bottom cap's donut hole.
    const units = Array.from({ length: n }, (_, i) => {
      const capY = h - CAP_H - i * CAP_PERIOD;
      const isTop = i === n - 1;
      const barBottom = capY + BAR_OVERLAP;
      const barTop = isTop ? -BAR_OVERHANG : barBottom - BAR_H;
      return { capY, barTop, barBottom };
    });

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          width: w,
          height: h,
          // Only physics-driven links get a compositor layer; static skeleton
          // links are positioned once and never re-transformed, so promoting
          // them is wasted GPU memory (~900 of them at the high tier).
          willChange: animated ? "transform" : undefined,
          pointerEvents: "none",
          // Bar overhangs above the box, cap is a hair wider than the wrapper;
          // both need to escape the box's bounds.
          overflow: "visible",
          // NO z-index — DOM paint order handles stacking (see file header).
        }}
      >
        <svg
          width={w}
          height={h + BAR_OVERHANG + BOTTOM_BAR_OVERHANG}
          viewBox={`0 ${-BAR_OVERHANG} ${w} ${h + BAR_OVERHANG + BOTTOM_BAR_OVERHANG}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            top: -BAR_OVERHANG,
            left: 0,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {/* All caps FIRST (z-back, donut rings with real holes). */}
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
          {/* All connector bars AFTER the caps (z-FRONT) — every connector sits
              ON TOP of every circle, the shaft passing in front of the ring
              (the donut hole still shows the page through it on either side of
              the bar). N discrete natural-size <rect>s, never one stretched. */}
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
          {/* Bottommost partial bar — the tail entering the flask. Also on top
              of the caps, same as the other connectors. */}
          {isBottommost && (
            <path
              d={bottomBarPath(barX, h)}
              fill="url(#chain-bar-grad)"
              stroke="#475f75"
              strokeWidth={1}
            />
          )}
        </svg>
      </div>
    );
  }
);

ChainLinkSVG.displayName = "ChainLinkSVG";
export default ChainLinkSVG;
