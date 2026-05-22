"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pointer } from "lucide-react";

/**
 * First-run interaction hint for the flask rack: a soft dimming scrim with an
 * animated "drag" pointer so visitors realise the bottles are physically
 * interactive. Purely visual (pointer-events-none) — it doesn't block the drag;
 * the scene dismisses it on the first real pointer-down.
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
          className="pointer-events-none absolute inset-0 z-[26] flex items-center justify-center bg-background/45 backdrop-blur-[2px]"
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
                animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                animate={{ x: [-18, 18, -18], rotate: [-8, 8, -8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
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
