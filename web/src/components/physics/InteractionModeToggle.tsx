"use client";

import { Pointer } from "lucide-react";
import { motion } from "motion/react";

import { useAppStore } from "@/lib/store/useAppStore";

const MODES = [
  { id: "drag", label: "Drag" },
  { id: "collide", label: "Push" },
] as const;

/** Per-mode mini-animation rendered inside each toggle button while the rack
 *  is NOT yet activated. Replaces the old full-rack FlaskHint scrim — each
 *  button now demonstrates its own gesture inline:
 *    drag → a small cursor swinging left-right with a rotate (the FlaskHint
 *           pointer in miniature)
 *    push → a small disc translating left-right (the cursor-pusher in
 *           miniature, matching PushCursorIndicator's look)
 *  Colour-flips to dark on the active (white) pill, white on the inactive one. */
function ModeMini({
  id,
  active,
}: {
  id: "drag" | "collide";
  active: boolean;
}) {
  if (id === "drag") {
    return (
      <span className="relative inline-flex h-3 w-5 items-center justify-center">
        <motion.span
          animate={{ x: [-3, 3, -3], rotate: [-10, 10, -10] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className={active ? "text-black" : "text-white/80"}
        >
          <Pointer size={11} />
        </motion.span>
      </span>
    );
  }
  return (
    <span className="relative inline-flex h-3 w-5 items-center justify-center">
      <motion.span
        animate={{ x: [-4, 4, -4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className={
          active
            ? "h-2 w-2 rounded-full border border-black/70 bg-black/25"
            : "h-2 w-2 rounded-full border border-white/70 bg-white/20"
        }
      />
    </span>
  );
}

/** Drag ↔ Push toggle pill that floats above the bottom wave. The active-state
 *  background is a single `motion.div` shared across both buttons via `layoutId`
 *  — same trick animate-ui's Highlight primitive uses — so the pill slides
 *  between the two when you switch. Both buttons stop pointer propagation so
 *  clicking either one never triggers a drag-start on the rack underneath.
 *  Hidden on touch (`hidden md:flex`). */
export default function InteractionModeToggle({
  activated,
}: {
  activated: boolean;
}) {
  const mode = useAppStore((s) => s.interactionMode);
  const setMode = useAppStore((s) => s.setInteractionMode);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div
      className="pointer-events-auto absolute left-1/2 z-[60] hidden -translate-x-1/2 select-none md:flex"
      style={{ bottom: "clamp(72px, 9vw, 150px)" }}
      onPointerDown={stop}
      onMouseDown={stop}
    >
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/40 p-1 text-xs backdrop-blur">
        {MODES.map(({ id, label }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(id)}
              className="relative flex items-center gap-1.5 rounded-full px-3 py-1"
            >
              {active && (
                <motion.span
                  layoutId="rack-mode-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-white/90"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              {!activated && <ModeMini id={id} active={active} />}
              <span
                className={
                  active
                    ? "relative text-black"
                    : "relative text-white/70 transition-colors hover:text-white"
                }
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
