/**
 * Hidden SVG holding the two gradients every chain link reuses. Inline SVG
 * gradient refs (`url(#chain-cap-grad)`, `url(#chain-bar-grad)`) resolve across
 * SVGs in the same document, so each ChainLinkSVG can pull these without
 * defining its own — the rack renders ~3000 paths at the high tier and minting
 * a `<linearGradient>` per link blows up the GPU memory + paint cost for no
 * visual gain (every link uses the exact same ramp). Rendered once at the top
 * of PhysicsScene; sized 0×0 so it never participates in layout.
 *
 * gradientUnits="objectBoundingBox" (the default) means each referencing shape
 * gets the ramp stretched across its OWN bounds — so the same `chain-cap-grad`
 * shades a tiny back-tier cap and a chunky front-tier cap correctly.
 */
export default function ChainGradients() {
  return (
    <svg
      aria-hidden
      focusable="false"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <defs>
        {/* The chunky horizontal "pill" at the bottom of each link — top-light
            to bottom-dark for a hint of dimensional shine. */}
        <linearGradient id="chain-cap-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d566f" />
          <stop offset="100%" stopColor="#1f2b38" />
        </linearGradient>
        {/* The slim vertical connector that runs between caps. A hair lighter
            so it reads as the "shaft" passing through the cap's ring. */}
        <linearGradient id="chain-bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#597186" />
          <stop offset="100%" stopColor="#2d3943" />
        </linearGradient>
      </defs>
    </svg>
  );
}
