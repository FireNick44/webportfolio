"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

/**
 * The round profile photo. Spins into place (instead of a plain fade) the first
 * time it scrolls into view, then keeps a subtle scroll-linked tilt + scale so
 * it gently reacts as you scroll up / down. Hover still zooms the image.
 */
export function AboutPhoto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const p = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    mass: 0.4,
  });
  const rotate = useTransform(p, [0, 1], [6, -10]);
  const scale = useTransform(p, [0, 0.5, 1], [0.95, 1.03, 0.95]);

  return (
    <motion.div
      ref={ref}
      initial={{ rotate: -250, scale: 0.5, opacity: 0 }}
      whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ type: "spring", stiffness: 55, damping: 13 }}
      className="mx-auto aspect-square w-full max-w-[20rem]"
    >
      <motion.div
        style={{ rotate, scale }}
        className="group relative h-full w-full"
      >
        <div className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-border">
          <Image
            src="/img/pic.webp"
            alt="Noel Studer"
            fill
            sizes="(max-width: 1024px) 70vw, 320px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
