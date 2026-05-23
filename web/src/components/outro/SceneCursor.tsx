"use client";

import { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";

/**
 * A custom "hunting" cursor shown while the pointer is over the outro (High tier
 * only): a glowing ring + dot that spring-follows the mouse, replacing the
 * native cursor so interacting with the scene feels distinct.
 */
export function SceneCursor() {
  const [over, setOver] = useState(false);
  const x = useSpring(0, { stiffness: 600, damping: 35, mass: 0.4 });
  const y = useSpring(0, { stiffness: 600, damping: 35, mass: 0.4 });

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
      className="pointer-events-none fixed left-0 top-0 z-[60] transition-opacity duration-200"
      style={{ x, y, opacity: over ? 1 : 0 }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-7 w-7 rounded-full border border-[#7fe9f5]/80"
          style={{ boxShadow: "0 0 14px rgba(127,233,245,0.55)" }}
        />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7fe9f5]" />
      </div>
    </motion.div>
  );
}
