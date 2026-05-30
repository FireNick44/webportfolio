"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import arts from "@/data/pointerQuartetArt.json";
import type { SizeSpan } from "@/lib/projectsLayout";

const ARTS = arts as { name: string; lines: string[] }[];

// Monospace metrics. Char advance ≈ 0.6em, so at font-size 10 a column is
// ~6px wide and a row ~12px tall. `preserveAspectRatio` then scales the grid
// to fit the left cell 1:1, whichever art is picked.
const FONT = 10;
const COL_W = 6;
const ROW_H = 12;

interface PointerQuartetProject {
  name: string;
  subtitle?: string;
  tech: readonly string[];
  url: string;
}

interface PointerQuartetCardProps {
  project: PointerQuartetProject;
  /** Zero-based grid index — drives the mono number prefix. */
  index: number;
  /** Pre-resolved background gradient from the parent. */
  gradient: string;
  /** Grid span resolved from the layout config. */
  span: SizeSpan;
}

// Normal wide (2×1) project card: standard gradient + paper-slide hover, with
// a random PointerQuartet ASCII art rendered in black on the left half and the
// usual description on the right. The page is a cached prerender, so the art is
// re-rolled client-side on mount — a different one shows on each refresh.
export default function PointerQuartetCard({
  project,
  index,
  gradient,
  span,
}: PointerQuartetCardProps) {
  // SSR + first client paint use art 0 (stable → no hydration mismatch); the
  // effect re-rolls after mount so refreshes vary.
  const [artIdx, setArtIdx] = useState(0);
  useEffect(() => {
    setArtIdx(Math.floor(Math.random() * ARTS.length));
  }, []);

  const lines = ARTS[artIdx].lines;
  const cols = lines[0]?.length ?? 0;
  const vbW = cols * COL_W;
  const vbH = lines.length * ROW_H + 4;

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group relative block"
      style={{
        gridColumn: `span ${span.col}`,
        gridRow: `span ${span.row}`,
      }}
    >
      {/* Sheet beneath — revealed as the front slides off, like the rest. */}
      <span
        aria-hidden
        className="absolute inset-0 border border-black/10 bg-black dark:border-white/20 dark:bg-white"
      />

      {/* Front sheet — same gradient + paper-slide as the rest of the grid. */}
      <div className="absolute inset-0 flex flex-col justify-between overflow-hidden border border-border bg-card p-4 transition-all duration-150 ease-out group-hover:-translate-y-3 group-hover:translate-x-3 group-hover:border-foreground/30 group-hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.55)]">
        <span
          aria-hidden
          className="grain pointer-events-none absolute inset-0"
          style={{ background: gradient }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-white/30"
        />

        {/* ASCII art — left cell, black on the gradient, scaled 1:1. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-1/2 items-center justify-center p-4">
          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full -translate-x-2"
            aria-hidden
          >
            <text
              xmlSpace="preserve"
              className="font-mono"
              fontSize={FONT}
              fill="#0c0c10"
            >
              {lines.map((line, i) => (
                <tspan key={i} x={0} y={ROW_H + i * ROW_H}>
                  {line}
                </tspan>
              ))}
            </text>
          </svg>
        </div>

        {/* Top row — mono index + arrow, confined to the right cell. */}
        <div className="relative z-10 flex items-start justify-between pl-[50%] text-[#0c0c10]">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[#0c0c10]/55">
            {String(index + 1).padStart(2, "0")}
          </span>
          <ArrowUpRight
            size={20}
            className="opacity-70 transition-opacity duration-150 ease-out group-hover:opacity-100"
          />
        </div>

        {/* Description — right cell. */}
        <div className="relative z-10 pl-[50%] text-[#0c0c10]">
          <h3 className="font-display text-2xl font-bold leading-[1.05] tracking-tight">
            {project.name}
          </h3>
          {project.subtitle && (
            <p className="mt-1 text-sm text-[#0c0c10]/65">{project.subtitle}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.tech.map((t) => (
              <span
                key={t}
                className="border border-[#0c0c10]/25 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#0c0c10]/70"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}
