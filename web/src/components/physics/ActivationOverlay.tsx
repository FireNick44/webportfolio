"use client";

import { AnimatePresence, motion } from "motion/react";

/** Click-to-activate overlay covering the whole rack until the user clicks it.
 *  Until then the engine is paused (see useFrameLoop's engineActive gate) so
 *  the rack stays visually frozen at spawn; click → activate + kick random
 *  flasks (see activateRack in PhysicsScene). z-40 covers everything beneath
 *  including the toggle, since changing modes before activation is undefined. */
export default function ActivationOverlay({
  show,
  onActivate,
}: {
  show: boolean;
  onActivate: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={onActivate}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-label="Activate the flask rack"
          // Full-rack overlay. Waves are bumped to z-50 (above overlay z-40) so
          // their filled silhouette renders on top of the blur — wave bands look
          // clean, blur only shows in the rack interior between them.
          className="absolute inset-0 z-40 flex cursor-pointer items-center justify-center bg-black/55 backdrop-blur-[2px]"
        >
          <span className="rounded-full border border-white/30 bg-white/10 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white/90 shadow-[0_0_24px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            Click to activate
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
