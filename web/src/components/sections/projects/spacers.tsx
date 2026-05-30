import type { ReactNode } from "react";

// Empty bento cells. SSR + first client paint use a single centred spacer
// (stable → no hydration mismatch); on mount it re-rolls to 1–3 spacers at
// random middle slots so each refresh looks a little different.
export const SPACER_DEFAULT = [3, 6];

// Minimum distance (in card-order positions) between two spacers so empty
// cells never end up adjacent / clustered in the same column.
const SPACER_MIN_GAP = 2;

/** Pick 1–3 distinct insertion indices among the middle slots of an
 *  `n`-card array — kept away from the very start and end of the grid. */
export function pickSpacers(n: number, want: number): number[] {
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

/** Splice invisible 1×1 spacer cells into the rendered card list at the
 *  given positions (descending so earlier indices don't shift as we insert). */
export function injectSpacers(
  cards: ReactNode[],
  positions: number[],
): ReactNode[] {
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
