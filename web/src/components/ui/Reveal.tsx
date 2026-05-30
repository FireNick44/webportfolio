"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  // Failsafe: motion renders `initial` opacity:0 into the SSR HTML, so if React
  // never hydrates (e.g. a device too slow to run the bundle) the content would
  // stay invisible forever. We render with `reveal-failsafe` — a CSS rule that
  // forces the element visible after a few seconds — and strip it the instant we
  // hydrate. Working pages keep the scroll-reveal; stuck pages still show text.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <motion.div
      className={cn(!hydrated && "reveal-failsafe", className)}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
