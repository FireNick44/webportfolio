"use client";

import { motion } from "motion/react";
import type { Dictionary } from "@/i18n/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The "thanks for stopping by" text, sitting high in the underwater block so
 *  the creatures have the water below to themselves. */
export function OutroContent({ dict }: { dict: Dictionary }) {
  const words = dict.footer.thanks.split(" ");

  return (
    <div
      className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8"
      style={{
        paddingTop: "clamp(6.5rem, 13vw, 10rem)",
        paddingBottom: "clamp(2.5rem, 6vw, 4rem)",
        textShadow: "0 2px 24px rgba(8,12,40,0.45)",
      }}
    >
      <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.25em] -mb-[0.25em]">
            <motion.span
              className="inline-block"
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{ delay: i * 0.06, duration: 0.55, ease: EASE }}
            >
              {w}&nbsp;
            </motion.span>
          </span>
        ))}
      </h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
        className="mt-5 max-w-md text-current/85"
      >
        {dict.footer.note}
      </motion.p>
    </div>
  );
}
