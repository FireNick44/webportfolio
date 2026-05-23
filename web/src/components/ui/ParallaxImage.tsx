"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A full-bleed background image with a gentle scroll-linked parallax — it drifts
 * slower than the page so it reads as sitting further back. Scaled up a touch so
 * the parallax shift never reveals the image edges.
 */
export function ParallaxImage({
  src,
  className,
  imgClassName,
  imgStyle,
  strength = 22,
}: {
  src: string;
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  /** Parallax travel as a % of the image height. */
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);

  return (
    <div ref={ref} aria-hidden className={cn("overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src={src}
        alt=""
        style={{ y, ...imgStyle }}
        className={cn("absolute inset-0 h-full w-full scale-[1.5] object-cover", imgClassName)}
      />
    </div>
  );
}
