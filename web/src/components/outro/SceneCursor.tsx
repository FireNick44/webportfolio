"use client";

import { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";

/**
 * The animate-ui cursor (its default arrow), spring-following the mouse while
 * over the outro on High tier — native cursor hidden so interacting feels
 * distinct. Black fill + white outline so it reads on the dark water.
 */
export function SceneCursor() {
  const [over, setOver] = useState(false);
  const x = useSpring(0, { stiffness: 900, damping: 40, mass: 0.3 });
  const y = useSpring(0, { stiffness: 900, damping: 40, mass: 0.3 });

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const onMove = (e: PointerEvent) => {
      const r = footer.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      setOver(inside);
      if (inside) {
        x.set(e.clientX);
        y.set(e.clientY);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] transition-opacity duration-150"
      style={{ x, y, opacity: over ? 1 : 0 }}
    >
      {/* animate-ui default cursor arrow (its exact path), tip at the pointer. */}
      <svg viewBox="0 0 40 40" width="26" height="26" style={{ display: "block" }}>
        <path
          d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
          fill="#0f0f0f"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
