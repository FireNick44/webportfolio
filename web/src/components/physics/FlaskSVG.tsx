import { forwardRef } from "react";
import { FLASK_WIDTH, FLASK_HEIGHT } from "@/physics/constants";

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
}

const FlaskSVG = forwardRef<HTMLDivElement, Props>(
  ({ id, color = "rgba(255,86,86,0.7)", skillIcon, iconBob, elevated }, ref) => {
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
    const clipId = `liquid-clip-${id}`;
    const rectId = `liquid-rect-${id}`;
    const dryClipId = `dry-clip-${id}`;
    const dryRectId = `dry-rect-${id}`;

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          width: FLASK_WIDTH,
          height: FLASK_HEIGHT,
          willChange: "transform",
          pointerEvents: "none",
          // Above the hint scrim (z-26) so the demo flask stays bright while the
          // rest dims; only the body is lifted, the chain stays wave-masked.
          zIndex: elevated ? 27 : undefined,
        }}
      >
        <svg
          width={FLASK_WIDTH}
          height={FLASK_HEIGHT}
          viewBox="0 0 139 180"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "hidden" }}
        >
          <defs>
            <linearGradient
              id={gradId1}
              x1="0.5"
              x2="0.929"
              y2="0.877"
              gradientUnits="objectBoundingBox"
            >
              <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
              <stop offset="1" stopColor="#bfbfbf" stopOpacity="0.502" />
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

            {/* Clip for liquid — rect counter-rotates so surface stays level */}
            {/* Water area: covers below the water line */}
            <clipPath id={clipId}>
              <rect
                id={rectId}
                x={-60}
                y={65}
                width={260}
                height={200}
              />
            </clipPath>
            {/* Dry area: covers above the water line */}
            <clipPath id={dryClipId}>
              <rect
                id={dryRectId}
                x={-60}
                y={-135}
                width={260}
                height={200}
              />
            </clipPath>
          </defs>

          {/* 1. Liquid fill (bottom layer, clipped) */}
          <g clipPath={`url(#${clipId})`}>
            <path
              d="M15.01,49.439H116v84.446c0,4.873.2,31.843-46.287,31.631H58.731C14.718,165.728,15,138.758,15,133.885Z"
              transform="translate(4, 2.483)"
              fill={color}
            />
          </g>

          {/* 2. Glass body outline */}
          <g transform="translate(0, 9)">
            <path
              d="M74.714,171H61.122C6.651,171.239,7,140.671,7,135.148V16H4a4,4,0,0,1-4-4V4A4,4,0,0,1,4,0H135a4,4,0,0,1,4,4v8a4,4,0,0,1-4,4h-3V135.148c0,5.5.242,35.849-56.61,35.851Z"
              fill={`url(#${gradId1})`}
              stroke="rgba(224,224,224,0.5)"
              strokeWidth={1}
            />
          </g>

          {/* 4. Band below cap */}
          <g transform="translate(3, 9)">
            <path
              d="M7,16V13H126v3Z"
              fill="none"
              stroke="rgba(224,224,224,0.5)"
              strokeWidth={1}
            />
          </g>

          {/* 5. Cork / cap */}
          <rect
            x={17}
            y={0}
            width={105}
            height={33}
            rx={3}
            fill="rgba(164,111,116,0.4)"
          />
          <path
            d="M3,0h99a3,3,0,0,1,3,3V9.019L0,8.987S0,4.274,0,3A3,3,0,0,1,3,0Z"
            transform="translate(17, 0)"
            fill={`url(#${gradId2})`}
          />

          {/* Skill icon — split into submerged part (clipped by water) and dry
              part. Rendered UNDER the glass reflections below, so it sits one
              layer back (behind the front-glass sheen) instead of pasted on top. */}
          {skillIcon && (
            <>
              {/* Submerged portion: clipped by the liquid line. */}
              <g clipPath={`url(#${clipId})`}>
                <g id={`icon-wet-${id}`}>
                  <g className={bobClass} style={bobStyle}>
                    <image
                      href={skillIcon}
                      x={34}
                      y={55}
                      width={70}
                      height={70}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                </g>
              </g>
              {/* Dry portion: everything above the water line */}
              <g clipPath={`url(#${dryClipId})`}>
                <g id={`icon-dry-${id}`}>
                  <g className={bobClass} style={bobStyle}>
                    <image
                      href={skillIcon}
                      x={34}
                      y={55}
                      width={70}
                      height={70}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                </g>
              </g>
            </>
          )}

          {/* Glass reflections — top layer, a sheen drawn over the icon */}
          <path
            d="M62.567,71.2s4.588-43.336-11.624-60.058S0,1.481,0,1.481,23.391,6.4,40.481,22.282C47.368,28.682,56.959,42.241,62.567,71.2Z"
            transform="translate(125.448, 109.577) rotate(90)"
            fill="rgba(255,255,255,0.17)"
          />
          <path
            d="M68.132,24.612c1.4-6.2-12.111-5.589-35.888-3.41s-47.7,4.728-46.834,10.69S66.734,30.813,68.132,24.612Z"
            transform="translate(49.692, 66.147) rotate(96)"
            fill={`url(#${gradId3})`}
          />
        </svg>
      </div>
    );
  }
);

FlaskSVG.displayName = "FlaskSVG";
export default FlaskSVG;
