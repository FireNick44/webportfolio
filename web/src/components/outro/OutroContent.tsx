"use client";

import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import type { Dictionary } from "@/i18n/types";

const GITHUB_URL = "https://github.com/FireNick44";
const EASE = [0.22, 1, 0.36, 1] as const;

function GithubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

export function OutroContent({ dict }: { dict: Dictionary }) {
  const words = dict.footer.thanks.split(" ");

  return (
    <div
      className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8"
      style={{
        paddingTop: "clamp(6rem, 12vw, 9rem)",
        paddingBottom: "clamp(8rem, 12vw, 11rem)",
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

      <div className="mt-12 flex flex-col gap-6 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-bold tracking-tight">
            {dict.footer.rights}
          </span>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-current/65">
            {dict.footer.builtWith}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub"
            className="group flex h-10 w-10 items-center justify-center border border-white/25 text-current/80 transition-all duration-300 ease-[var(--ease-lab)] hover:-translate-y-0.5 hover:border-white/70 hover:text-current"
          >
            <GithubMark size={18} />
          </a>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group flex h-10 items-center gap-2 border border-white/25 px-4 text-current/80 transition-colors duration-300 hover:border-white/70 hover:text-current"
          >
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em]">
              {dict.footer.backToTop}
            </span>
            <ArrowUp
              size={15}
              className="transition-transform duration-300 ease-[var(--ease-lab)] group-hover:-translate-y-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
