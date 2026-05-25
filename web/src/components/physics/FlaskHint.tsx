"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pointer } from "lucide-react";

/**
 * First-run interaction hint for the flask rack: a soft dimming scrim with an
 * animated "drag" cursor so visitors realise they can grab a bottle and drag it.
 * One demo flask is lifted bright above the scrim (see PhysicsScene) as the thing
 * to grab. Purely visual (pointer-events-none); the scene dismisses it on the
 * first press.
 */
export default function FlaskHint({
  show,
  label,
}: {
  show: boolean;
  label: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
          // Mobile rack is tall (170vh); keep the hint in the first screen
          // (top-aligned) instead of centering ~85vh down. Desktop centers.
          className="pointer-events-none absolute inset-0 z-[26] flex items-start justify-center bg-background/45 pt-[38vh] backdrop-blur-[2px] md:items-center md:pt-0"
        >
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <span className="relative flex h-14 w-28 items-center justify-center rounded-full border border-border bg-background/85 shadow-sm">
              {/* ghost pulse */}
              <motion.span
                className="absolute inset-0 rounded-full border border-foreground/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0, 0.45] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* cursor grabbing + dragging side to side */}
              <motion.span
                animate={{ x: [-16, 16, -16], rotate: [-6, 6, -6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Pointer size={24} className="text-foreground" />
              </motion.span>
            </span>
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-foreground">
              {label}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
