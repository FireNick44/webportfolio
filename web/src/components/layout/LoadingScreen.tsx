"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAppStore } from "@/store/useAppStore";

const EASE = [0.76, 0, 0.24, 1] as const;
const FILL_DURATION = 1.6;

export default function LoadingScreen() {
  const setHasShownLoader = useAppStore((s) => s.setHasShownLoader);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (useAppStore.getState().hasShownLoader) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setHasShownLoader(true);
    }, 1900);
    return () => clearTimeout(t);
  }, [setHasShownLoader]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: EASE }}
          // Theme-aware border frame (white in dark, black in light) like the
          // original / beatloops loaders.
          style={{ border: "clamp(8px, 1.4vw, 16px) solid var(--foreground)" }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center gap-7">
            {/* "NS" filling left-to-right over a faint base */}
            <div className="relative inline-block font-display text-7xl font-bold leading-none tracking-tight sm:text-8xl">
              <span className="text-foreground/15">
                NS<span className="text-accent/30">.</span>
              </span>
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-foreground"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: FILL_DURATION, ease: EASE }}
              >
                NS<span className="text-accent">.</span>
              </motion.span>
            </div>

            {/* progress line, same left-to-right direction */}
            <div className="h-px w-48 overflow-hidden bg-foreground/15">
              <motion.div
                className="h-full bg-foreground"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: FILL_DURATION, ease: EASE }}
              />
            </div>

            <span className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
              calibrating workspace
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
