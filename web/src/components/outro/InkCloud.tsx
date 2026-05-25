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

const PUFF_MS = 950; // matches the ink-bloom keyframe duration (snappy)

// Three offset blobs per puff → an organic, lopsided cloud, not one flat circle.
const BLOBS = [
  { dx: 0, dy: 0, size: 190, delay: 0 },
  { dx: -40, dy: 16, size: 122, delay: 90 },
  { dx: 34, dy: 24, size: 104, delay: 150 },
];

// Dense, slightly indigo black so it reads against the near-black deep-sea bg
// (a pure teal-black blob would vanish into the gradient). It occludes the
// kelp/bubbles behind it (z-7) → reads as a cloud of ink.
const INK_BG =
  "radial-gradient(circle, rgba(7,5,16,0.96) 0%, rgba(11,9,22,0.82) 42%, rgba(11,9,22,0) 72%)";

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
