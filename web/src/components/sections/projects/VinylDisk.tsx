"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";

// Spinning vinyl disc ported from /Users/yannic/dev/beatloops (VinylDisk.tsx).
// Renders a 15×15 grid clipped to a circle: a static groove layer below, a
// spinning two-armed arm layer on top. The animate-ui MotionGrid dependency
// from the source has been dropped — we run the frame index off a single
// setInterval and let CSS transition the opacity for each cell.

const GRID = 15;
const CENTER = (GRID - 1) / 2; // 7.0
const MAX_RADIUS = 7.2;
const HOLE_RADIUS = 1.0;
const FRAMES = 24;
const ARM_HALF_WIDTH = 0.45;

function isInDisk(col: number, row: number): boolean {
  const dx = col - CENTER;
  const dy = row - CENTER;
  const r = Math.sqrt(dx * dx + dy * dy);
  return r <= MAX_RADIUS && r > HOLE_RADIUS;
}

// Static "which cells live inside the disc" mask. 1-D for cheap lookup.
const DISC_MASK: boolean[] = Array.from({ length: GRID * GRID }, (_, i) => {
  const col = i % GRID;
  const row = Math.floor(i / GRID);
  return isInDisk(col, row);
});

function buildArmFrame(frameIndex: number): boolean[] {
  const baseAngle = -(frameIndex / FRAMES) * Math.PI * 2;
  const armAngles = [baseAngle, baseAngle + Math.PI];
  const mask: boolean[] = new Array(GRID * GRID).fill(false);
  for (let col = 0; col < GRID; col++) {
    for (let row = 0; row < GRID; row++) {
      const idx = row * GRID + col;
      if (!DISC_MASK[idx]) continue;
      const cellAngle = Math.atan2(row - CENTER, col - CENTER);
      for (const angle of armAngles) {
        let diff = cellAngle - angle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) < ARM_HALF_WIDTH) {
          mask[idx] = true;
          break;
        }
      }
    }
  }
  return mask;
}

// Pre-compute the 24 arm frames once at module load — they never change.
const ARM_FRAMES: boolean[][] = Array.from({ length: FRAMES }, (_, i) =>
  buildArmFrame(i),
);

interface VinylDiskProps {
  size?: number;
  speed?: number;
  /**
   * Seconds for one full counter-rotation of the whole disc (CSS backspin).
   * Independent of the arm sweep (`speed`). Default 6.
   */
  backspinSeconds?: number;
  /**
   * Static backwards tilt of the disc, in degrees — the disc lies back
   * into the screen like a turntable seen from the front. 0 = flat-on.
   * Default 38.
   */
  tiltDeg?: number;
  /**
   * CSS perspective distance for the tilt, in pixels. Smaller = more
   * dramatic. Default 600.
   */
  perspective?: number;
  /**
   * Extra rotateX added to the static tilt, in degrees. Drive from a
   * parent mouse handler to make the disc parallax under the cursor.
   */
  pitchOffsetDeg?: number;
  /**
   * RotateY around the disc's vertical axis, in degrees. Driven from
   * the same parent mouse handler for a yaw effect.
   */
  yawOffsetDeg?: number;
}

export default function VinylDisk({
  size = 140,
  speed = 110,
  backspinSeconds = 6,
  tiltDeg = 38,
  perspective = 600,
  pitchOffsetDeg = 0,
  yawOffsetDeg = 0,
}: VinylDiskProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES), speed);
    return () => clearInterval(id);
  }, [speed]);

  // ~2–3px between cells, scaled with the disc.
  const gap = Math.max(1, Math.round(size / 60));

  const gridStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      inset: 0,
      display: "grid",
      gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
      gridAutoRows: "1fr",
      gap,
      pointerEvents: "none",
    }),
    [gap],
  );

  const armMask = ARM_FRAMES[frame];

  return (
    // Outer: establishes a perspective for the child's rotateX. Sized at
    // `size × size` so layout space matches the un-tilted disc; the visual
    // height after tilt is roughly `size * cos(tiltDeg)`.
    <div
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        perspective: `${perspective}px`,
      }}
    >
      {/* Middle: the static backwards tilt — top edge of the disc recedes
          into the screen. Keeps preserve-3d so the spinning child rotates
          inside this tilted plane instead of collapsing back to 2D.
          Pitch and yaw offsets ride on top of the static tilt so a parent
          can drive parallax from cursor position. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          // Positive rotateX: bottom of the disc comes toward the viewer,
          // top recedes into the screen — turntable seen from above.
          transform: `rotateY(${yawOffsetDeg}deg) rotateX(${tiltDeg + pitchOffsetDeg}deg)`,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
          transition: "transform 60ms ease-out",
        }}
      >
        {/* Inner: the continuous CSS backspin around the tilted plane's
            axis (i.e., the disc's own Z, not the viewer's). The circle
            clip turns the foreshortened square into a perfect ellipse. */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: backspinSeconds,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            inset: 0,
            clipPath: "circle(50% at center)",
          }}
        >
          {/* Layer 1 — static groove dots. */}
          <div style={gridStyle}>
            {DISC_MASK.map((on, i) => (
              <div
                key={`g${i}`}
                style={{
                  backgroundColor: on ? "#1a1a1a" : "transparent",
                  clipPath: "circle(50% at center)",
                }}
              />
            ))}
          </div>

          {/* Layer 2 — spinning arms light cells to white with a soft fade. */}
          <div style={gridStyle}>
            {armMask.map((on, i) => (
              <div
                key={`a${i}`}
                style={{
                  backgroundColor: "#fff",
                  opacity: on ? 0.92 : 0,
                  transition: "opacity 70ms linear",
                  clipPath: "circle(50% at center)",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
