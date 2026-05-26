"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import projects from "@/data/projects.json";
import layout from "@/data/projects-layout.json";
import { resolveSpan, type ProjectsLayout } from "@/lib/projectsLayout";
import type { Dictionary } from "@/i18n/types";
import { Reveal } from "@/components/ui/Reveal";

const L = layout as ProjectsLayout;

// Bright per-card gradients ported 1:1 from the 2024 portfolio (with
// dark text on top, as in the original). Cycled by index.
const PROJECT_GRADIENTS = [
  "linear-gradient(170deg, #7afff8, #8174f7)",
  "linear-gradient(123deg, #95bef5, #5ad698)",
  "linear-gradient(23deg, #a1f2ff, #dfa3ee)",
  "linear-gradient(170deg, #e1a1ff, #e46565)",
  "linear-gradient(210deg, #b1e9f3, #855ad6)",
  "linear-gradient(150deg, #9eebcb, #d2e69c)",
  "linear-gradient(233deg, #855ad6, #dfa3ee)",
  "linear-gradient(70deg, #1e4eee, #a1f2ff)",
];

const cardGradient = (i: number) =>
  PROJECT_GRADIENTS[i % PROJECT_GRADIENTS.length];

export default function Projects({ dict }: { dict: Dictionary }) {
  const [secretOpen, setSecretOpen] = useState(false);

  return (
    <section
      id="projects"
      className="relative mx-auto max-w-5xl px-5 py-28 sm:px-8 sm:py-36"
    >
      <Reveal>
        <span className="lab-label">{dict.projects.label}</span>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {dict.projects.title}
        </h2>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {dict.projects.subtitle}
        </p>
      </Reveal>

      <Reveal delay={0.12} className="mt-14">
        <div
          className="grid grid-cols-[repeat(var(--p-cols-base),minmax(0,1fr))] sm:grid-cols-[repeat(var(--p-cols-sm),minmax(0,1fr))] lg:grid-cols-[repeat(var(--p-cols-lg),minmax(0,1fr))]"
          style={
            {
              "--p-cols-base": L.columns.base,
              "--p-cols-sm": L.columns.sm,
              "--p-cols-lg": L.columns.lg,
              gridAutoRows: L.rowHeight,
              gridAutoFlow: "dense",
              gap: L.gap,
            } as CSSProperties
          }
        >
          {projects.map((p, i) => {
            const span = resolveSpan(L, "size" in p ? p.size : undefined);
            return (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative block"
              style={{
                gridColumn: `span ${span.col}`,
                gridRow: `span ${span.row}`,
              }}
            >
              {/* Sheet beneath — revealed as the colourful front slides off.
                  Black on light pages, white on dark — contrasts either way. */}
              <span
                aria-hidden
                className="absolute inset-0 border border-black/10 bg-black dark:border-white/20 dark:bg-white"
              />

              {/* Front sheet: random colourful grain + content. On hover it
                  slides to the top-right with a shadow — paper on paper. */}
              <div className="absolute inset-0 flex flex-col justify-between overflow-hidden border border-border bg-card p-4 transition-all duration-150 ease-out group-hover:-translate-y-3 group-hover:translate-x-3 group-hover:border-foreground/30 group-hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.55)]">
                <span
                  aria-hidden
                  className="grain pointer-events-none absolute inset-0"
                  style={{ background: cardGradient(i) }}
                />
                {/* Soft white wash — mutes the gradient toward pastel so it's
                    "less colour space" while keeping the dark text readable. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-white/30"
                />

                {/* Dark text on the bright gradient, like the original. */}
                <div className="relative z-10 flex items-start justify-between text-[#0c0c10]">
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[#0c0c10]/55">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ArrowUpRight
                    size={20}
                    className="-translate-x-1 translate-y-1 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                  />
                </div>

                <div className="relative z-10 text-[#0c0c10]">
                  <h3 className="font-display text-2xl font-bold leading-[1.05] tracking-tight">
                    {p.name}
                  </h3>
                  {"subtitle" in p && p.subtitle && (
                    <p className="mt-1 text-sm text-[#0c0c10]/65">
                      {p.subtitle}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tech.map((t) => (
                      <span
                        key={t}
                        className="border border-[#0c0c10]/25 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#0c0c10]/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {"secret" in p && p.secret && (
                  <button
                    type="button"
                    aria-label="?"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSecretOpen((s) => !s);
                    }}
                    className="absolute bottom-3 right-3 z-10 font-mono text-sm text-[#0c0c10]/40 transition-colors hover:text-[#0c0c10]"
                  >
                    ?
                  </button>
                )}
              </div>
            </a>
            );
          })}
        </div>
      </Reveal>

      <AnimatePresence>
        {secretOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-px flex flex-col items-center gap-4 border border-border bg-card p-8 text-center">
              <div className="relative h-40 w-40">
                <Image
                  src="/img/secret.webp"
                  alt="A little secret"
                  fill
                  sizes="160px"
                  className="object-contain"
                />
              </div>
              <span className="lab-label">you found the hidden reagent</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
