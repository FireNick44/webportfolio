"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

// Five-band SVG terrain behind the flask rack. Inlined (not an external file)
// so the 5 path fills can reference theme CSS vars — a shuffle that recolours
// the flask water also recolours the backdrop into a matching hue family
// (see SKILLS_BG_VARS in themePresets.ts + defaults in globals.css). Parallax
// drift matches the previous ParallaxImage (~14% travel). BOTH waves are
// rendered inside PhysicsScene, in front of the flasks.
const BG_PATHS = [
  "M0,136H56v-18h57v13h56v18h56v-36h56v23h57v18h56v-18h56v-9h56v9h57v13h56v14h56v-32h113v23h56v-18h56V0H0V136Z",
  "M0,171.17H56v4h57v9h56v14h56v-14h56v23h57v-9h56v-9h56v4h113v27h56v-27h112v-22h57v40h56v-31h56v-47h-56v18h-56v-23h-113v32h-56v-14h-56v-13h-57v-9h-56v9h-56v18h-56v-18h-57v-23h-56v36h-56v-18h-56v-13H56v18H0v38Z",
  "M0,328.17H56v-72h57v59h56v36h56v-32h56v-4h57v-23h56v72h56v-49h56v-23h57v14h56v54h56v-68h56v45h57v9h56v5h56V178.17h-56v31h-56v-40h-57v22h-112v27h-56v-27h-113v-4h-56v9h-56v9h-57v-23h-56v14h-56v-14h-56v-9H56v-4H0v159Z",
  "M0,414.17H113v45h56v-18h56v36h56v-5h57v-22h56v9h112v-41h57v14h56v18h112v4h57v-31h56v22h56v-96h-56v-5h-56v-9h-57v-45h-56v68h-56v-54h-56v-14h-57v23h-56v49h-56v-72h-56v23h-57v4h-56v32h-56v-36h-56v-59H56v72H0v88Z",
  "M0,600.5H900v-157.33h-56v-22h-56v31h-57v-4h-112v-18h-56v-14h-57v41h-112v-9h-56v22h-57v5h-56v-36h-56v18h-56v-45H0v188.33Z",
];

export default function FlaskBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-14%", "14%"]);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.svg
        style={{ y }}
        viewBox="0 0 900 600"
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
        className="absolute inset-0 h-full w-full scale-[1.5]"
      >
        {BG_PATHS.map((d, i) => (
          <path key={i} d={d} fill={`var(--skills-bg-${i})`} />
        ))}
      </motion.svg>
    </div>
  );
}
