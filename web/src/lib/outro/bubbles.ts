import { mulberry32 } from "@/lib/utils/mulberry32";

export interface Bubble {
  id: number;
  /** Horizontal anchor, 0..1 of canvas width. */
  baseX: number;
  /** Vertical position in px from the top (mutated each frame). */
  y: number;
  /** Radius in px. */
  r: number;
  /** Upward speed in px/s. */
  speed: number;
  wobbleAmp: number;
  wobbleFreq: number;
  wobblePhase: number;
}

export function generateBubbles(
  seed: number,
  count: number,
  bounds: { width: number; height: number },
): Bubble[] {
  const rng = mulberry32(seed);
  const out: Bubble[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      baseX: rng(),
      y: rng() * bounds.height,
      r: 1.5 + rng() * 5,
      speed: 18 + rng() * 36,
      wobbleAmp: 3 + rng() * 8,
      wobbleFreq: 0.5 + rng() * 1.5,
      wobblePhase: rng() * Math.PI * 2,
    });
  }
  return out;
}
