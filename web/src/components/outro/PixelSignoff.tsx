"use client";

// A small "NS" (Noel Studer) rendered as a hand-built HTML pixel grid — the
// "made it in markup, no image" flourish. 7 rows × 11 cols; 1 = lit cell.
const GRID: number[][] = [
  [1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0],
];

const COLS = 11;
const CELL = 4; // px per pixel block
const LIT = "#7fe9f5"; // bioluminescent cyan, reads against deep water

export function PixelSignoff() {
  const flat = GRID.flat();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-4 right-4 z-[4]"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
        gap: "1px",
      }}
    >
      {flat.map((on, i) =>
        on ? (
          <span
            key={i}
            style={{
              width: CELL,
              height: CELL,
              background: LIT,
              boxShadow: `0 0 ${CELL}px ${LIT}`,
              // gentle column-staggered glow; paused tabs simply rest lit.
              animation: `ns-glow 2.4s ease-in-out ${(i % COLS) * 0.08}s infinite`,
            }}
          />
        ) : (
          <span key={i} style={{ width: CELL, height: CELL }} />
        ),
      )}
    </div>
  );
}
