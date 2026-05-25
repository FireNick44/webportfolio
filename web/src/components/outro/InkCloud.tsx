"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

export interface InkHandle {
  emit: (x: number, y: number) => void;
}

interface Puff {
  id: number;
  x: number;
  y: number;
}

const PUFF_MS = 1400; // matches the ink-bloom keyframe duration

// Three offset blobs per puff → an organic, lopsided cloud, not one flat circle.
const BLOBS = [
  { dx: 0, dy: 0, size: 150, delay: 0 },
  { dx: -34, dy: 14, size: 96, delay: 90 },
  { dx: 30, dy: 20, size: 84, delay: 150 },
];

const INK_BG =
  "radial-gradient(circle, rgba(8,12,16,0.7) 0%, rgba(8,12,16,0.45) 45%, rgba(8,12,16,0) 72%)";

/**
 * Renders short-lived CSS ink puffs behind the octopus (z-7). Imperative: the
 * octopus calls emit(x,y) at its underside when harassed. Pure CSS (no canvas),
 * so it runs on the mobile `low` tier. Blur is a static filter — only transform
 * and opacity animate (cheap).
 */
export const InkCloud = forwardRef<InkHandle>(function InkCloud(_props, ref) {
  const [puffs, setPuffs] = useState<Puff[]>([]);

  const emit = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    setPuffs((p) => [...p, { id, x, y }]);
    setTimeout(() => setPuffs((p) => p.filter((q) => q.id !== id)), PUFF_MS);
  }, []);

  useImperativeHandle(ref, () => ({ emit }), [emit]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[7]">
      {puffs.map((puff) => (
        <div key={puff.id} className="absolute" style={{ left: puff.x, top: puff.y }}>
          {BLOBS.map((b, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: b.dx - b.size / 2,
                top: b.dy - b.size / 2,
                width: b.size,
                height: b.size,
                borderRadius: "9999px",
                background: INK_BG,
                filter: "blur(6px)",
                animation: `ink-bloom ${PUFF_MS}ms ease-out forwards`,
                animationDelay: `${b.delay}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
