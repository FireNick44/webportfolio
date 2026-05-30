"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import projects from "@/data/projects.json";
import layout from "@/data/projects-layout.json";
import { resolveSpan, type ProjectsLayout } from "@/lib/projectsLayout";
import type { Dictionary } from "@/i18n/types";
import { Reveal } from "@/components/ui/Reveal";
import BeatloopsCard from "@/components/sections/projects/BeatloopsCard";
import PointerQuartetCard from "@/components/sections/projects/PointerQuartetCard";

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

// Per-variant gradient overrides. Tiles tagged with `variant` in the
// project JSON skip the indexed palette and use their own colours.
const VARIANT_GRADIENTS: Record<string, string> = {
  beatloops: "linear-gradient(135deg, #8b3bff 0%, #ff3b6b 100%)",
};

const cardGradient = (i: number, variant?: string) =>
  (variant && VARIANT_GRADIENTS[variant]) ??
  PROJECT_GRADIENTS[i % PROJECT_GRADIENTS.length];

// Empty bento cells. SSR + first client paint use a single centred spacer
// (stable → no hydration mismatch); on mount it re-rolls to 1–3 spacers at
// random middle slots so each refresh looks a little different.
const SPACER_DEFAULT = [3, 6];

// Minimum distance (in card-order positions) between two spacers so empty
// cells never end up adjacent / clustered in the same column.
const SPACER_MIN_GAP = 2;

// Pick 1–3 distinct insertion indices among the middle slots of an
// `n`-card array — kept away from the very start and end of the grid.
function pickSpacers(n: number, want: number): number[] {
  const min = 3;
  const max = Math.max(min, n - 3);
  const slots: number[] = [];
  for (let i = min; i <= max; i++) slots.push(i);
  // Fisher–Yates shuffle for random positions each roll.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const chosen: number[] = [];
  // First pass: keep spacers spaced apart (≥ SPACER_MIN_GAP).
  for (const s of slots) {
    if (chosen.length >= want) break;
    if (chosen.every((c) => Math.abs(c - s) >= SPACER_MIN_GAP)) chosen.push(s);
  }
  // Fallback: if spacing came up short of `want`, fill remaining slots so the
  // requested count is still met (relevant when 3 gaps won't all fit spaced).
  for (const s of slots) {
    if (chosen.length >= want) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.sort((a, b) => a - b);
}

// Splice invisible 1×1 spacer cells into the rendered card list at the given
// positions (descending so earlier indices don't shift as we insert).
function injectSpacers(cards: ReactNode[], positions: number[]): ReactNode[] {
  const out = [...cards];
  for (const pos of [...positions].sort((a, b) => b - a)) {
    if (pos < 0 || pos > out.length) continue;
    out.splice(
      pos,
      0,
      <div
        key={`spacer-${pos}`}
        aria-hidden
        style={{ gridColumn: "span 1", gridRow: "span 1" }}
      />,
    );
  }
  return out;
}

export default function Projects({ dict }: { dict: Dictionary }) {
  const [secretOpen, setSecretOpen] = useState(false);
  const [spacers, setSpacers] = useState<number[]>(SPACER_DEFAULT);
  useEffect(() => {
    // 3 gaps on mobile (the 2-col base layout), 2 on sm+ desktop. Re-rolls on
    // mount and whenever the breakpoint is crossed.
    const mq = window.matchMedia("(max-width: 639px)");
    const roll = () =>
      setSpacers(pickSpacers(projects.length, mq.matches ? 3 : 2));
    roll();
    mq.addEventListener("change", roll);
    return () => mq.removeEventListener("change", roll);
  }, []);

  // Square cells: drive `grid-auto-rows` from the live column-track width so a
  // 1×1 cell is square (and wide/tall spans stay congruent) at every
  // breakpoint, gaps included. Pure CSS can't tie row height to a `1fr` column.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const sync = () => {
      const firstTrack = getComputedStyle(el).gridTemplateColumns.split(" ")[0];
      const w = parseFloat(firstTrack);
      if (w > 0) el.style.setProperty("--row-h", `${w}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
          ref={gridRef}
          className="grid justify-center grid-cols-[repeat(var(--p-cols-base),minmax(0,var(--cell-max)))] sm:grid-cols-[repeat(var(--p-cols-sm),minmax(0,var(--cell-max)))] lg:grid-cols-[repeat(var(--p-cols-lg),minmax(0,var(--cell-max)))]"
          style={
            {
              "--p-cols-base": L.columns.base,
              "--p-cols-sm": L.columns.sm,
              "--p-cols-lg": L.columns.lg,
              "--cell-max": "225px",
              gridAutoRows: `var(--row-h, ${L.rowHeight})`,
              gridAutoFlow: "dense",
              gap: L.gap,
            } as CSSProperties
          }
        >
          {injectSpacers(
            projects.map((p, i) => {
            const span = resolveSpan(L, "size" in p ? p.size : undefined);
            const variant =
              "variant" in p ? (p.variant as string | undefined) : undefined;
            const isSecret = "secret" in p && p.secret;
            const textTop = "textTop" in p && p.textTop;
            if (variant === "beatloops") {
              return (
                <BeatloopsCard
                  key={p.name}
                  project={p}
                  index={i}
                  gradient={cardGradient(i, variant)}
                  span={span}
                />
              );
            }
            if (variant === "ascii") {
              return (
                <PointerQuartetCard
                  key={p.name}
                  project={p}
                  index={i}
                  gradient={cardGradient(i, variant)}
                  span={span}
                />
              );
            }
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
              <div
                className={`absolute inset-0 flex flex-col overflow-hidden border border-border bg-card p-4 transition-all duration-150 ease-out group-hover:-translate-y-3 group-hover:translate-x-3 group-hover:border-foreground/30 group-hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.55)] ${
                  textTop ? "justify-start gap-4 pt-10" : "justify-between"
                }`}
              >
                <span
                  aria-hidden
                  className="grain pointer-events-none absolute inset-0"
                  style={{ background: cardGradient(i, variant) }}
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
                    className="opacity-70 transition-opacity duration-150 ease-out group-hover:opacity-100"
                  />
                </div>

                <div
                  className={`relative z-10 text-[#0c0c10] ${
                    isSecret ? "pr-[50%]" : ""
                  }`}
                >
                  <h3 className="font-display text-2xl font-bold leading-[1.05] tracking-tight">
                    {p.name}
                  </h3>
                  {"subtitle" in p && p.subtitle && (
                    <p className="mt-1 text-sm text-[#0c0c10]/65">
                      {p.subtitle}
                    </p>
                  )}
                  {!textTop && (
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
                  )}
                </div>

                {/* textTop tiles: tech pinned to the bottom while the title
                    stays up top (tall-tile look). */}
                {textTop && (
                  <div className="absolute inset-x-4 bottom-4 z-10 flex flex-wrap gap-1.5 text-[#0c0c10]">
                    {p.tech.map((t) => (
                      <span
                        key={t}
                        className="border border-[#0c0c10]/25 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#0c0c10]/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {isSecret && (
                  <>
                    {/* Reveal the hidden reagent in the right cell of the
                        wide tile. Backed by bg-card so the webp reads over
                        the bright gradient; ? toggles it. */}
                    <AnimatePresence>
                      {secretOpen && (
                        <motion.div
                          key="secret-reagent"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
                          className="absolute inset-y-0 right-0 z-20 flex w-1/2 items-center justify-center p-4"
                        >
                          {/* Click the reagent to flip back to the ? prompt. */}
                          <button
                            type="button"
                            aria-label="Hide secret"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSecretOpen((s) => !s);
                            }}
                            className="relative h-28 w-28 cursor-pointer border border-border bg-card shadow-sm"
                          >
                            <Image
                              src="/img/secret.webp"
                              alt="A little secret"
                              fill
                              sizes="120px"
                              className="object-contain p-3"
                            />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!secretOpen && (
                      <button
                        type="button"
                        aria-label="?"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSecretOpen((s) => !s);
                        }}
                        className="absolute bottom-3 right-3 z-30 font-mono text-sm text-[#0c0c10]/40 transition-colors hover:text-[#0c0c10]"
                      >
                        ?
                      </button>
                    )}
                  </>
                )}
              </div>
            </a>
            );
            }),
            spacers,
          )}
        </div>
      </Reveal>
    </section>
  );
}
