"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useAppStore } from "@/lib/store/useAppStore";

/** Floating circle that tracks the cursor while in "Push" mode — gives the user
 *  a visual handle for the matter cursor-pusher body (r=24 in useMousePhysics).
 *  The native cursor is set to `cursor-default` on the rack container when in
 *  Push mode (see the container className), so this disc acts as the visible
 *  "where my push lands" indicator. Updates its `transform` directly via DOM
 *  ref — no React re-renders per mousemove. Only renders in collide mode AND
 *  on desktop (hidden md:block); collide mode can't be entered on mobile
 *  anyway (the toggle is desktop-only), but defending it explicitly. */
export default function PushCursorIndicator() {
  const mode = useAppStore((s) => s.interactionMode);
  const ref = useRef<HTMLDivElement | null>(null);
  // Viewport cursor; updated by pointermove, re-read by the scroll listener so
  // a wheel-scroll without mouse movement still places the disc correctly.
  const lastClientRef = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode !== "collide") return;
    const container = document.querySelector(
      "[data-rack-active]",
    ) as HTMLDivElement | null;
    if (!container) return;
    const sync = () => {
      const el = ref.current;
      if (!el) return;
      const rect = container.getBoundingClientRect();
      const { x: cx, y: cy } = lastClientRef.current;
      // Dead-zone: top + bottom wave bands (same clamp the WaveDivider uses).
      // The matter cursor body is gated identically in useMousePhysics, so the
      // disc and the actual pushing agree.
      const waveH = Math.max(56, Math.min(130, 0.08 * window.innerWidth));
      const active =
        cx >= rect.left && cx <= rect.right &&
        cy >= rect.top + waveH && cy <= rect.bottom - waveH;
      if (active) {
        // Outer div top-left lands at the cursor's container-local position.
        // The inner motion.div's `-ml-6 -mt-6` then back-shifts by half its
        // 48px size so its centre sits on (cx, cy). Don't add another
        // translate(-50%, -50%) here — that double-shifts and the disc rides
        // ~12px up-left of the cursor.
        el.style.transform = `translate3d(${cx - rect.left}px, ${cy - rect.top}px, 0)`;
      }
      setVisible(active);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      lastClientRef.current = { x: e.clientX, y: e.clientY };
      sync();
    };
    const onScroll = () => sync();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mode]);

  if (mode !== "collide") return null;
  // Outer div owns the cursor-tracking transform (set imperatively, no React
  // re-renders per move). Inner motion.div owns opacity+scale, so the framer
  // animation can't clobber the position transform (which it would on a single
  // element since motion composes scale into the same `transform` property).
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[60] hidden md:block"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.55 }}
        animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.55 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="-ml-6 -mt-6 h-12 w-12 rounded-full border-2 border-white/60 bg-white/10 shadow-[0_0_14px_rgba(255,255,255,0.25)]"
      />
    </div>
  );
}
