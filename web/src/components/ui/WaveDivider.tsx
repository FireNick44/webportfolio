// Animated wave divider. Each wave is several layered oscillators (mixed
// sin/cos, random freq/phase/amplitude) summed and then NORMALISED to a
// controlled amplitude band — like stacking synth/"DJ" waveforms — so the shape
// is organic and unpredictable but never too tall/aggressive. It morphs gently
// between a few phase-shifted variants of the same base (so the up/down motion
// stays subtle), smoothed with Catmull-Rom cubic beziers. Seeded → deterministic
// → identical on server + client (no hydration mismatch).

const VW = 1440;
const VH = 132;
const TAU = Math.PI * 2;
const KEYFRAMES = 4; // gentle variants each wave morphs through
const OSC = 5; // oscillators layered per wave

// Tiny seeded RNG (mulberry32) — local so this UI component has no deps.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Osc = { fn: (n: number) => number; a: number; f: number; p: number };

/** Sum the oscillators, normalise to baseY ± amp, smooth with cubic beziers. */
function buildPath(base: Osc[], shift: number[], baseY: number, amp: number): string {
  const N = 14;
  const raw: number[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * VW;
    let y = 0;
    for (let j = 0; j < base.length; j++) {
      const o = base[j];
      y += o.a * o.fn((x / VW) * o.f * TAU + o.p + shift[j]);
    }
    raw.push(y);
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2 || 1;
  const pts = raw.map((y, i) => ({
    x: Math.round((i / N) * VW),
    y: +(baseY + ((y - mid) / half) * amp).toFixed(1),
  }));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1);
    const c1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1);
    const c2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1);
    const c2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return `${d} L${VW},${VH} L0,${VH} Z`;
}

/** A SMIL `values` list: KEYFRAMES gentle variants of one base, looping. */
function makeWave(rng: () => number, baseY: number, amp: number): string {
  const base: Osc[] = Array.from({ length: OSC }, () => ({
    fn: rng() < 0.5 ? Math.sin : Math.cos,
    a: 0.35 + rng() * 0.65,
    f: 1 + Math.floor(rng() * 4), // 1–4 humps
    p: rng() * TAU,
  }));
  const shapes = Array.from({ length: KEYFRAMES }, () =>
    buildPath(base, base.map(() => (rng() - 0.5) * 1.1), baseY, amp),
  );
  return [...shapes, shapes[0]].join(";");
}

const KEY_TIMES = "0;0.25;0.5;0.75;1";
const KEY_SPLINES = "0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1";

export function WaveDivider({
  fill = "var(--background)",
  flip = false,
  className,
  height = "clamp(56px, 8vw, 130px)",
  seed = 1,
}: {
  fill?: string;
  flip?: boolean;
  className?: string;
  height?: string;
  /** Different seeds → different wave shapes (deterministic, SSR-safe). */
  seed?: number;
}) {
  const rng = mulberry32(seed);
  const back = makeWave(rng, 64, 16);
  const front = makeWave(rng, 52, 20);

  return (
    <div
      aria-hidden
      className={className}
      style={{ lineHeight: 0, transform: flip ? "scaleY(-1)" : undefined }}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height, overflow: "visible" }}
      >
        <path fill={fill} fillOpacity={0.45}>
          <animate
            attributeName="d"
            dur="22s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes={KEY_TIMES}
            keySplines={KEY_SPLINES}
            values={back}
          />
        </path>
        <path fill={fill}>
          <animate
            attributeName="d"
            dur="15s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes={KEY_TIMES}
            keySplines={KEY_SPLINES}
            values={front}
          />
        </path>
      </svg>
    </div>
  );
}
