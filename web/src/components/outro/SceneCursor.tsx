"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring } from "motion/react";
import { cursorCapture } from "@/lib/outro/cursorCapture";

/**
 * The animate-ui arrow cursor, spring-following the mouse while over the outro
 * (High tier; native cursor hidden). The octopus can briefly grab it (held) and
 * drag it around; on release the spring glides it back to the real pointer. We
 * never relocate it persistently — the OS cursor can't be moved.
 */
export function SceneCursor() {
  const x = useSpring(0, { stiffness: 900, damping: 40, mass: 0.3 });
  const y = useSpring(0, { stiffness: 900, damping: 40, mass: 0.3 });
  const op = useSpring(0, { stiffness: 300, damping: 30 });
  const mouse = useRef({ x: 0, y: 0 });
  const overRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const onMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      const r = footer.getBoundingClientRect();
      overRef.current =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      if (cursorCapture.held) {
        // Octopus is dragging the cursor.
        x.set(cursorCapture.x);
        y.set(cursorCapture.y);
      } else {
        // Follow the real pointer — after a release the spring glides it back.
        x.set(mouse.current.x);
        y.set(mouse.current.y);
      }
      op.set(cursorCapture.held || overRef.current ? 1 : 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [x, y, op]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60]"
      style={{ x, y, opacity: op }}
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
