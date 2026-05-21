import { forwardRef } from "react";
import { CHAIN_SEGMENT_WIDTH } from "../physics/constants";

interface Props {
  id: string;
  segmentHeight: number;
}

const ChainLinkSVG = forwardRef<HTMLDivElement, Props>(
  ({ id, segmentHeight }, ref) => {
    const gradientId = `chain-grad-${id}`;
    const w = CHAIN_SEGMENT_WIDTH;
    const h = segmentHeight;

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          width: w,
          height: h,
          willChange: "transform",
          pointerEvents: "none",
        }}
      >
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3d566f" />
              <stop offset="100%" stopColor="#1f2b38" />
            </linearGradient>
          </defs>
          <rect
            x={2}
            y={1}
            width={w - 4}
            height={h - 2}
            rx={4}
            ry={4}
            fill={`url(#${gradientId})`}
            stroke="#4a6a85"
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  }
);

ChainLinkSVG.displayName = "ChainLinkSVG";
export default ChainLinkSVG;
