import { forwardRef } from "react";

import { FLASK_WIDTH, FLASK_HEIGHT } from "@/physics/constants";
import {
  FLASK_SHAPE_DEFS,
  FLASK_GLASS_STROKE,
  type FlaskShape,
} from "@/physics/flaskShapes";

interface Props {
  id: string;
  color?: string;
  skillIcon?: string;
  /** When set, the skill icon bobs up/down; `delay` is its phase offset and
   *  `dur` its period (s) — both varied per flask so they never bob in lockstep.
   *  undefined → no animation (low/off graphics tier). */
  iconBob?: { delay: number; dur: number };
  /** Lift this flask above the hint scrim (z > scrim) — the bright "drag me" demo. */
  elevated?: boolean;
  /** Bottle silhouette (rect/round/cone). Data in `flaskShapes.ts`. */
  shape?: FlaskShape;
  /** Water alpha override (0..1). Defaults to whatever the colour string carries. */
  liquidOpacity?: number;
  /** Decorative back-tier flask. Drops the 3D gradient + side highlight for a
   *  flatter, more solid look so the back layer reads as background depth, not
   *  competing detail. */
  isSkeleton?: boolean;
}

const FlaskSVG = forwardRef<HTMLDivElement, Props>(
  (
    {
      id,
      color = "rgba(255,86,86,0.7)",
      skillIcon,
      iconBob,
      elevated,
      shape = "rect",
      liquidOpacity,
      isSkeleton = false,
    },
    ref,
  ) => {
    const def = FLASK_SHAPE_DEFS[shape];
    // The bob wraps the icon image as a CHILD of icon-wet/icon-dry, because
    // syncDom REPLACES the transform attribute on those <g>s every frame — a
    // child wrapper composes (rotate from parent, translateY here) untouched.
    const bobClass = iconBob !== undefined ? "flask-icon-bob" : undefined;
    const bobStyle =
      iconBob !== undefined
        ? ({
            animationDelay: `${iconBob.delay}s`,
            animationDuration: `${iconBob.dur}s`,
          } as const)
        : undefined;
    const gradId1 = `flask-lg1-${id}`;
    const gradId2 = `flask-lg2-${id}`;
    const gradId3 = `flask-lg3-${id}`;
    const gradShade = `flask-shade-${id}`;
    const clipId = `liquid-clip-${id}`;
    const rectId = `liquid-rect-${id}`;

    // Clip rects are generous so they cover even when the liquid rect rotates
    // by ±MAX_LIQUID_TILT_DEG. Sized off the shape's viewBox.
    const [, , vbW, vbH] = def.viewBox.split(" ").map(Number);
    const clipPad = Math.max(vbW, vbH);

    // `color` is now a CSS-var ref (var(--flask-cN)) so it follows theme +
    // shuffle. Alpha is applied via fill-opacity on the path so the var can
    // stay a clean solid hex/rgb.
    const waterFill = color;
    const waterAlpha =
      typeof liquidOpacity === "number" ? liquidOpacity : 0.7;
    const { iconBox, cork, corkOverlay, band, glass, water, sheens, bodyShade } = def;

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          width: FLASK_WIDTH,
          height: FLASK_HEIGHT,
          // Only physics flasks are re-transformed per frame; skeletons are
          // positioned once, so promoting them to a compositor layer is wasted
          // GPU memory (~49 idle layers at the high tier).
          willChange: isSkeleton ? undefined : "transform",
          pointerEvents: "none",
          // Above the hint scrim (z-26) so the demo flask stays bright while the
          // rest dims; only the body is lifted, the chain stays wave-masked.
          zIndex: elevated ? 27 : undefined,
        }}
      >
        <svg
          width={FLASK_WIDTH}
          height={FLASK_HEIGHT}
          viewBox={def.viewBox}
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "hidden" }}
        >
          <defs>
            <linearGradient
              id={gradId1}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="objectBoundingBox"
            >
              {/* Horizontal left-to-right body shading. Pushed up (test): more
                  solid + stronger left highlight so front flasks read with
                  similar weight to the flat skeleton fill behind them. */}
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="1" stopColor="#1a1a1a" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient
              id={gradId2}
              x1="0.813"
              y1="-0.586"
              x2="0.958"
              y2="6.481"
              gradientUnits="objectBoundingBox"
            >
              <stop offset="0" stopColor="#a46f74" />
              <stop offset="1" stopColor="#52383a" stopOpacity="0.259" />
            </linearGradient>
            <linearGradient
              id={gradId3}
              x1="0.622"
              y1="0.416"
              x2="-0.29"
              y2="1.117"
              gradientUnits="objectBoundingBox"
            >
              <stop offset="0" stopColor="#fff" stopOpacity="0.302" />
              <stop offset="1" stopColor="gray" stopOpacity="0" />
            </linearGradient>

            {/* Body-shade gradient — vertical white-alpha fading to transparent.
                Drives the optional bodyShade path each shape may carry, ported
                from the 2024 SVGs' left-side highlight overlays. */}
            <linearGradient
              id={gradShade}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
              gradientUnits="objectBoundingBox"
            >
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Water area: covers below the water line. Counter-rotates via the
                rect id so the surface stays level as the flask swings. */}
            <clipPath id={clipId}>
              <rect
                id={rectId}
                x={-clipPad}
                y={def.clipY}
                width={clipPad * 3}
                height={clipPad * 2}
              />
            </clipPath>
          </defs>

          {/* 1. Liquid fill (bottom layer, clipped to the body interior). */}
          <g clipPath={`url(#${clipId})`}>
            <path
              d={water.d}
              transform={water.transform}
              fill={waterFill}
              fillOpacity={waterAlpha}
            />
          </g>

          {/* 2. Glass body outline — gradient on physics flasks, flat fill on
              skeletons so the back layer reads as quiet depth not detail. */}
          <g transform={glass.transform}>
            <path
              d={glass.d}
              fill={
                isSkeleton ? "rgba(160,160,165,0.55)" : `url(#${gradId1})`
              }
              stroke="rgba(224,224,224,0.5)"
              strokeWidth={FLASK_GLASS_STROKE}
            />
          </g>

          {/* 3. Band below cap */}
          <g transform={band.transform}>
            <path
              d={band.d}
              fill="none"
              stroke="rgba(224,224,224,0.5)"
              strokeWidth={1}
            />
          </g>

          {/* 3b. Optional body shading (per shape) — subtle left-side highlight
              overlay that the 2024 SVGs had on the cone/rect. Skipped for
              skeletons (they're flat by design). */}
          {bodyShade && !isSkeleton && (
            <path
              d={bodyShade.d}
              transform={bodyShade.transform}
              fill={`url(#${gradShade})`}
            />
          )}

          {/* 4. Cork / cap */}
          <rect
            x={cork.x}
            y={cork.y}
            width={cork.w}
            height={cork.h}
            rx={3}
            fill="rgba(164,111,116,0.4)"
          />
          <path
            d={corkOverlay.d}
            transform={corkOverlay.transform}
            fill={`url(#${gradId2})`}
          />

          {/* 5. Skill icon — ONE copy, drawn AFTER the glass body so it reads in
              FRONT of the glass. (Previously two identical copies clipped to the
              wet/dry halves of the water line — the split produced no visible
              difference, so it was collapsed to halve the per-frame icon raster.)
              The bob (CSS) + the tilt spring (id ref) both still drive it. */}
          {skillIcon && (
            <g id={`icon-${id}`}>
              <g className={bobClass} style={bobStyle}>
                <image
                  href={skillIcon}
                  x={iconBox.x}
                  y={iconBox.y}
                  width={iconBox.w}
                  height={iconBox.h}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            </g>
          )}

          {/* 6. Glass reflections — top sheen drawn over everything. */}
          {sheens.map((s, i) => (
            <path
              key={i}
              d={s.d}
              transform={s.transform}
              fill={s.gradient ? `url(#${gradId3})` : "rgba(255,255,255,0.17)"}
            />
          ))}
        </svg>
      </div>
    );
  },
);

FlaskSVG.displayName = "FlaskSVG";
export default FlaskSVG;
