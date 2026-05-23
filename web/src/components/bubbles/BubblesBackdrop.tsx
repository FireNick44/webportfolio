"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The animated bubbles SVG background (src/svg/intro-bg.svg), embedded via <img>
 * so its SMIL animation runs. It has a gentle scroll-linked PARALLAX so it
 * drifts slower than the page (reads as sitting "further back"); scaled up a
 * touch so the parallax shift never reveals its edges. Only the SVG parallaxes —
 * the canvas bubbles (WaterCanvas) are separate.
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src="/svg/intro-bg.svg"
        alt=""
        style={{ y, ...imgStyle }}
        className={cn("absolute inset-0 h-full w-full scale-[1.5] object-cover", op)}
      />
    </div>
  );
}
