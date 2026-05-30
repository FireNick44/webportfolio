"use client";

import { ChevronDown } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { useEffect, useState } from "react";

import { BubblesBackdrop } from "@/components/bubbles/BubblesBackdrop";
import { WaveDivider } from "@/components/ui/WaveDivider";
import type { Dictionary } from "@/i18n/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/useAppStore";

const EASE = [0.22, 1, 0.36, 1] as const;

// Per-character "rise from a mask" reveal for the name.
const nameContainer: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.28, staggerChildren: 0.04 } },
};
const charUp: Variants = {
  hidden: { y: "105%" },
  show: { y: "0%", transition: { duration: 0.72, ease: EASE } },
};

export default function Hero({ dict }: { dict: Dictionary }) {
  // Hold the reveal until the loader is done, so the title animates in FRONT of
  // the user instead of being wasted behind the loading screen. Fallback timer
  // guarantees it reveals even if the loader flag never flips.
  const hasShownLoader = useAppStore((s) => s.hasShownLoader);
  const [ready, setReady] = useState(hasShownLoader);
  useEffect(() => {
    if (hasShownLoader) {
      setReady(true);
      return;
    }
    const t = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, [hasShownLoader]);

  // Once the reveal lands, drop the per-letter clip masks so the text shadow
  // isn't cut off at each letter box.
  const [done, setDone] = useState(false);
  const name = dict.hero.name;
  const chars = [...name];

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6"
    >
      <BubblesBackdrop className="absolute inset-0" intensity="full" />

      {/* The bubbles background is a fixed blue in both themes, so hero text is
          pinned light (not theme `--foreground`) to stay readable in light mode. */}
      <div
        className="relative z-10 flex flex-col items-center text-center text-[#f5f0e6]"
        style={{ textShadow: "0 2px 28px rgba(8,12,40,0.45)" }}
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          className="mb-5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-current/80"
        >
          {dict.hero.greeting}
        </motion.span>

        {/* Name — each letter rises out of a clipping mask, staggered. */}
        <motion.h1
          variants={nameContainer}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
          aria-label={name}
          // The per-letter overflow-hidden masks clip the inherited text-shadow
          // into hard dark rectangles during the rise. Hold the shadow off until
          // the letters land (when the masks open to overflow-visible), then ease
          // it in — so the soft glow appears only once it can't be clipped.
          style={{
            textShadow: done ? "0 2px 28px rgba(8,12,40,0.45)" : "none",
            transition: "text-shadow 0.5s ease-out",
          }}
          className="font-display text-[clamp(3rem,12vw,11rem)] font-bold leading-[0.92] tracking-tight"
        >
          {chars.map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "inline-block pb-[0.12em] align-bottom",
                done ? "overflow-visible" : "overflow-hidden"
              )}
            >
              <motion.span
                variants={charUp}
                className="inline-block"
                onAnimationComplete={
                  i === chars.length - 1 ? () => setDone(true) : undefined
                }
              >
                {ch === " " ? " " : ch}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
          className="mt-6 max-w-md text-balance text-current/90"
        >
          {dict.hero.tagline}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[#f5f0e6]/80"
      >
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.28em]">
          {dict.hero.scroll}
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>

      {/* Wave transition into the next section */}
      <WaveDivider
        fill="var(--background)"
        className="absolute inset-x-0 bottom-0 z-[5]"
      />
    </section>
  );
}
