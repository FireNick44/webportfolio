"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface PointerField {
  /** Pointer X in pixels, local to the container's top-left. */
  x: number;
  /** Pointer Y in pixels, local to the container's top-left. */
  y: number;
  /** Horizontal velocity (px since last move). */
  vx: number;
  /** Vertical velocity. */
  vy: number;
  /** True while the pointer is over the container's bounds. */
  active: boolean;
}

/**
 * Tracks the pointer in coordinates local to `containerRef`, using window-level
 * listeners so it works regardless of z-index / pointer-events on the scene.
 * Returns a ref (no re-renders) for rAF consumers to read each frame.
 */
export function usePointerField(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): RefObject<PointerField> {
  const field = useRef<PointerField>({ x: 0, y: 0, vx: 0, vy: 0, active: false });

  useEffect(() => {
    if (!enabled) {
      field.current.active = false;
      return;
    }
    const onMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      field.current.vx = x - field.current.x;
      field.current.vy = y - field.current.y;
      field.current.x = x;
      field.current.y = y;
      field.current.active = inside;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [containerRef, enabled]);

  return field;
}
