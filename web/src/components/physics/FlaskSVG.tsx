import { forwardRef } from "react";

import {
  FLASK_WIDTH,
  FLASK_HEIGHT,
  FLASK_HITBOX_WIDTH,
  FLASK_HITBOX_HEIGHT,
} from "@/lib/physics/constants";
import {
  FLASK_SHAPE_DEFS,
  FLASK_GLASS_STROKE,
  type FlaskShape,
} from "@/lib/physics/flaskShapes";
import { TOUCH_HIT_PAD } from "@/lib/physics/grabSelection";

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
    // The bob wraps the icon image as a CHILD of the #icon-<id> layer, because
    // syncDom REPLACES that layer's transform (the tilt spring) — a child
    // wrapper composes (rotate from parent, translateY here) untouched.
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
    // viewBox → px mapping of the <svg> below (preserveAspectRatio default =
    // xMidYMid meet): uniform scale, centred. Lets the HTML icon layer sit
    // exactly where the SVG <image> used to.
    const vbScale = Math.min(FLASK_WIDTH / vbW, FLASK_HEIGHT / vbH);
    const vbOffX = (FLASK_WIDTH - vbW * vbScale) / 2;
    const vbOffY = (FLASK_HEIGHT - vbH * vbScale) / 2;

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

          {/* 5. Glass reflections — top sheen drawn over everything. */}
          {sheens.map((s, i) => (
            <path
              key={i}
              d={s.d}
              transform={s.transform}
              fill={s.gradient ? `url(#${gradId3})` : "rgba(255,255,255,0.17)"}
            />
          ))}
        </svg>

        {/* 6. Skill icon — an HTML layer OVER the svg, not an SVG <image>.
            CSS transforms on SVG children can't be composited, so the idle bob
            (and the tilt spring's per-frame rotate) re-rasterised the entire
            flask texture every frame: ~27 flask repaints/frame while the rack
            was on screen. As HTML with its own layer, the bob is a GPU-only
            animation and the rotate is a compositor-only transform write.
            #icon-<id> is what syncDom rotates; transform-origin = the shape's
            pivot in px. Trade-off: the icon now paints above the sheens. */}
        {skillIcon && (
          <div
            id={`icon-${id}`}
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `${vbOffX + def.pivot.x * vbScale}px ${vbOffY + def.pivot.y * vbScale}px`,
              willChange: "transform",
              pointerEvents: "none",
            }}
          >
            <div
              className={bobClass}
              style={{
                position: "absolute",
                left: vbOffX + iconBox.x * vbScale,
                top: vbOffY + iconBox.y * vbScale,
                width: iconBox.w * vbScale,
                height: iconBox.h * vbScale,
                // Promote at mount: the bob is paused until the rack is on
                // screen, and a compositor layer created at animation start
                // would put 27 layer rasters into the scroll-in frame.
                willChange: bobClass ? "transform" : undefined,
                ...bobStyle,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={skillIcon}
                alt=""
                draggable={false}
                style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>
        )}

        {/* 7. Touch hit layer — the ONLY pointer-events target inside a flask.
            Sized to the Matter hitbox + TOUCH_HIT_PAD, centred like the body.
            `touch-action: none` here (inside the rack's `pan-y` container)
            means a touch that lands on a bottle is never taken over by the
            browser as a scroll, so useMousePhysics can drag it in ANY
            direction; it still hands strongly vertical swipes back to the
            page via a JS pan. Skeletons aren't grabbable → no layer. */}
        {!isSkeleton && (
          <div
            data-flask-hit=""
            style={{
              position: "absolute",
              left: (FLASK_WIDTH - FLASK_HITBOX_WIDTH) / 2 - TOUCH_HIT_PAD,
              top: (FLASK_HEIGHT - FLASK_HITBOX_HEIGHT) / 2 - TOUCH_HIT_PAD,
              width: FLASK_HITBOX_WIDTH + TOUCH_HIT_PAD * 2,
              height: FLASK_HITBOX_HEIGHT + TOUCH_HIT_PAD * 2,
              pointerEvents: "auto",
              touchAction: "none",
            }}
          />
        )}
      </div>
    );
  },
);

FlaskSVG.displayName = "FlaskSVG";
export default FlaskSVG;
