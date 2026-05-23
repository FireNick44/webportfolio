"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { lerp } from "@/lib/outro/cursorPhysics";
import type { PointerField } from "@/hooks/usePointerField";

/**
 * A creature that lazily follows the pointer (lerp → trailing lag, so fast
 * mouse moves make it "dart" to catch up). Hidden when the pointer leaves the
 * scene. Loads the real /underwater/octopus.gif when present, falling back to
 * an emoji until that asset is dropped in.
 */
export function CursorFollower({ pointer }: { pointer: RefObject<PointerField | null> }) {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const pos = useRef({ x: 0, y: 0, init: false });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const frame = () => {
      const p = pointer.current;
      if (p) {
        if (!pos.current.init) {
          pos.current.x = p.x;
          pos.current.y = p.y;
          pos.current.init = true;
        }
        pos.current.x = lerp(pos.current.x, p.x, 0.08);
        pos.current.y = lerp(pos.current.y, p.y, 0.08);
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
        el.style.opacity = p.active ? "1" : "0";
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pointer]);

  return (
    <div
      ref={elRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[7] select-none leading-none transition-opacity duration-300"
      style={{ willChange: "transform", opacity: 0 }}
    >
      {failed ? (
        <span className="text-3xl">🐙</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/underwater/octopus.gif"
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          style={{ height: 64, width: "auto", imageRendering: "pixelated", display: "block" }}
        />
      )}
    </div>
  );
}
