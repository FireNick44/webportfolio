"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

import { INTRO_BUBBLES_SVG } from "./introBubblesMarkup";

/**
 * The animated bubbles SVG background, INLINED (not an <img>) so its gradient +
 * bubble fills can read the theme's `--hero-*` CSS vars — a random theme recolours
 * them, otherwise they fall back to the original blue palette. SMIL animation
 * still runs inline. Has a gentle scroll-linked PARALLAX so it drifts slower than
 * the page (reads as sitting "further back"); scaled up a touch so the parallax
 * shift never reveals its edges. Only the SVG parallaxes — the canvas bubbles
 * (WaterCanvas) are separate.
 */
export function BubblesBackdrop({
  className,
  intensity = "full",
  imgStyle,
}: {
  className?: string;
  intensity?: "subtle" | "full";
  /** Extra image styles (e.g. the reef's colour grade filter). */
  imgStyle?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-22%", "22%"]);
  const op = intensity === "subtle" ? "opacity-70" : "opacity-100";

  return (
    <div ref={ref} aria-hidden className={cn("overflow-hidden", className)}>
      <motion.div
        style={{ y, ...imgStyle }}
        className={cn("absolute inset-0 h-full w-full scale-[1.5]", op)}
        dangerouslySetInnerHTML={{ __html: INTRO_BUBBLES_SVG }}
      />
    </div>
  );
}
