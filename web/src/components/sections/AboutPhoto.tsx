"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

/**
 * The round profile photo. Spins into place (instead of a plain fade) the first
 * time it scrolls into view, then keeps a subtle scroll-linked tilt + scale so
 * it gently reacts as you scroll up / down. Hover still zooms the image.
 *
 * Sizing: the outer gets `aspect-square + max-w` so its box is fully defined,
 * and the inner mask anchors via `absolute inset-0` instead of an `h-full`
 * chain. Chromium (Android Chrome) can leave an `h-full` child of an
 * aspect-ratio parent at 0 height — the image then renders 0×0 and the photo
 * looks "gone" — while WebKit/Safari is more lenient. Insets keep the inner
 * mask fully constrained without depending on `h-full` propagating through.
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
      className="relative mx-auto aspect-square w-full max-w-[30rem] lg:mx-0"
    >
      <motion.div
        style={{ rotate, scale }}
        className="group absolute inset-0 overflow-hidden rounded-full ring-1 ring-border"
      >
        <Image
          src="/img/pic.webp"
          alt="Yannic Studer"
          fill
          sizes="(max-width: 1024px) 70vw, 480px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </motion.div>
    </motion.div>
  );
}
