"use client";

import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

import VinylDisk from "@/components/sections/projects/VinylDisk";
import type { SizeSpan } from "@/lib/projectsLayout";

// Maximum extra rotation the disc gets from cursor parallax, in degrees.
// Pitch rides on top of the disc's static back-tilt; yaw is a horizontal
// spin around the disc's vertical axis.
const DISC_PITCH_RANGE = 12;
const DISC_YAW_RANGE = 20;

interface BeatloopsProject {
  name: string;
  subtitle?: string;
  tech: readonly string[];
  url: string;
}

interface BeatloopsCardProps {
  project: BeatloopsProject;
  /** Zero-based grid index — drives the mono number prefix. */
  index: number;
  /** Pre-resolved background gradient from the parent. */
  gradient: string;
  /** Grid span resolved from the layout config. */
  span: SizeSpan;
}

// Beatloops-specific project tile: paper-slide on hover like the other
// cards, plus a spinning vinyl disc on the right that parallax-tilts to
// follow the cursor. The tile itself stays flat — only the disc reacts.
export default function BeatloopsCard({
  project,
  index,
  gradient,
  span,
}: BeatloopsCardProps) {
  const [tilt, setTilt] = useState<{ pitch: number; yaw: number } | null>(
    null,
  );
  // rAF throttle: a 120 Hz macOS mouse otherwise sets state ~8 ms apart and
  // the wrapper's `transition: transform 60ms` retriggers mid-flight every
  // tick — Safari especially handles overlapping transitions poorly and
  // stutters. Coalesce to one update per animation frame.
  const pendingTiltRef = useRef<{ pitch: number; yaw: number } | null>(null);
  const rafRef = useRef(0);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLAnchorElement>) => {
      // Touch / pen pointers don't drive parallax — they have no hover
      // state and the gesture would fight scrolling.
      if (e.pointerType !== "mouse") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      // Cursor on the right → disc yaws right; cursor near the top of
      // the tile → disc tips further back (parallax). Cursor at the
      // bottom flattens it out.
      const yaw = (x - 0.5) * 2 * DISC_YAW_RANGE;
      const pitch = -(y - 0.5) * 2 * DISC_PITCH_RANGE;
      pendingTiltRef.current = { pitch, yaw };
      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          if (pendingTiltRef.current) setTilt(pendingTiltRef.current);
        });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingTiltRef.current = null;
    setTilt(null);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group relative block"
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      style={{
        gridColumn: `span ${span.col}`,
        gridRow: `span ${span.row}`,
      }}
    >
      {/* Sheet beneath — revealed as the colourful front slides off. */}
      <span
        aria-hidden
        className="absolute inset-0 border border-black/10 bg-black dark:border-white/20 dark:bg-white"
      />

      {/* Front sheet — same paper-slide as the rest of the grid. */}
      <div className="absolute inset-0 flex flex-col justify-between overflow-hidden border border-border bg-card p-4 transition-all duration-150 ease-out group-hover:-translate-y-3 group-hover:translate-x-3 group-hover:border-foreground/30 group-hover:shadow-[0_20px_45px_-12px_rgba(0,0,0,0.55)]">
        <span
          aria-hidden
          className="grain pointer-events-none absolute inset-0"
          style={{ background: gradient }}
        />

        {/* Spinning vinyl disc centred inside the right 1×1 cell of the
            2×1 tile (right half, full height, flex-centred). Larger
            nominal size compensates for foreshortening from the static
            back-tilt. Parallax pitch/yaw come from the parent pointer
            handler; static tilt is bumped for a more aggressive
            "vinyl in your face" feel. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-1/2 items-center justify-center pr-4">
          <VinylDisk
            size={180}
            tiltDeg={50}
            perspective={500}
            pitchOffsetDeg={tilt?.pitch ?? 0}
            yawOffsetDeg={tilt?.yaw ?? 0}
          />
        </div>

        {/* Top row — mono index + always-visible arrow. */}
        <div className="relative z-10 flex items-start justify-between text-[#0c0c10]">
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-[#0c0c10]/55">
            {String(index + 1).padStart(2, "0")}
          </span>
          <ArrowUpRight
            size={20}
            className="opacity-70 transition-opacity duration-150 ease-out group-hover:opacity-100"
          />
        </div>

        {/* Title block — confined to the left 1×1 cell so it never runs
            under the disc's right-half cell. */}
        <div className="relative z-10 pr-[50%] text-[#0c0c10]">
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
