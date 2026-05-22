# Underwater Outro — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a switchable "The Deep" underwater outro scene (ambient Low-tier: recolored water, procedural bubbles, pixel-art sand, swaying pixel kelp) that the current footer can toggle to via a new settings control — without deleting the existing outro.

**Architecture:** Refactor today's `Footer` into an `OutroSection` that renders shared content over a *swappable backdrop* (`ClassicBackdrop` = today's look; `DeepScene` = the new underwater scene). The scene is a stack of layers: a recolored `intro-bg.svg` for depth, a `<canvas>` for procedural bubbles, and DOM pixel-grids for sand + kelp. A Zustand setting picks the scene; a game-style "graphics tier" + reduced-motion + pointer-type gate how much animates, and an in-view/tab-visible check pauses the render loop off-screen.

**Tech Stack:** Next.js 16 (App Router) + React 19, TypeScript (strict), Zustand 5 (persisted), Tailwind 4, HTML Canvas 2D, `mulberry32` seeded RNG (reused from `web/src/physics/generateFlasks.ts`), Vitest.

---

## Conventions for this plan

- **Run all commands from `web/`** (the Next.js app root): `cd web` first.
- **Typecheck:** `npx tsc --noEmit` — must be clean.
- **Tests:** `npm test` (all) or `npx vitest run <path>` (one file).
- **Do NOT gate on `next build`** — it fails on pre-existing react-compiler ESLint errors unrelated to this work. Gate on `tsc` + `vitest`.
- **Manual checks** use `npm run dev` (open `http://localhost:3000/en`, scroll to the footer, use `/en/settings` → Appearance → "Outro scene").
- Phase 1 needs **no external art assets** — sand, kelp, and bubbles are generated in code; the background reuses the existing `web/public/svg/intro-bg.svg`.
- Work happens on the existing branch `feature/underwater-outro`.

## File structure (Phase 1)

```
web/src/
├── store/useAppStore.ts                      # MODIFY: add outroScene + graphicsTier (persisted)
├── lib/outro/
│   ├── tiers.ts                              # CREATE: GraphicsTier, TIER_ORDER, resolveGraphicsTier, atLeast (pure)
│   ├── tiers.test.ts                         # CREATE
│   ├── bubbles.ts                            # CREATE: Bubble, generateBubbles (pure)
│   ├── bubbles.test.ts                       # CREATE
│   ├── sand.ts                               # CREATE: generateSand (pure)
│   ├── sand.test.ts                          # CREATE
│   ├── kelp.ts                               # CREATE: KelpStrand, generateKelp (pure)
│   └── kelp.test.ts                          # CREATE
├── hooks/
│   ├── useGraphicsTier.ts                    # CREATE: reads store + media queries → effective tier
│   └── useSceneActive.ts                     # CREATE: IntersectionObserver + Page Visibility
├── components/outro/
│   ├── OutroContent.tsx                      # CREATE: shared heading + note + footer bar (extracted from Footer)
│   ├── ClassicBackdrop.tsx                   # CREATE: today's footer backdrop (extracted from Footer)
│   ├── OutroSection.tsx                      # CREATE: <footer> wrapper; picks backdrop by scene
│   ├── SandFloor.tsx                         # CREATE: pixel-art sand grid
│   ├── Kelp.tsx                              # CREATE: swaying pixel kelp strands
│   ├── WaterCanvas.tsx                       # CREATE: canvas bubble field
│   └── DeepScene.tsx                         # CREATE: composes bg + canvas + kelp + sand, gated by tier/active
├── app/[lang]/layout.tsx                     # MODIFY: render OutroSection instead of Footer
├── app/globals.css                           # MODIFY: append @keyframes kelp-sway
├── components/settings/SettingsPanel.tsx     # MODIFY: add "Outro scene" controls
└── components/layout/Footer.tsx              # DELETE (logic moves to outro/*)
```

---

### Task 1: Store — `outroScene` + `graphicsTier`

**Files:**
- Modify: `web/src/store/useAppStore.ts`

- [ ] **Step 1: Add the two fields + setters to the `AppState` interface**

In `web/src/store/useAppStore.ts`, add to the `AppState` interface (after the `advanced` block, before the closing `}`):

```ts
  /** Which outro variant renders at the bottom of the page. */
  outroScene: "classic" | "deep";
  setOutroScene: (scene: "classic" | "deep") => void;
  /** Game-style quality tier for the underwater scene. */
  graphicsTier: "off" | "low" | "medium" | "high";
  setGraphicsTier: (tier: "off" | "low" | "medium" | "high") => void;
```

- [ ] **Step 2: Add defaults + setter implementations**

In the `create(...)` initializer object (after the `advanced` lines), add:

```ts
      outroScene: "classic",
      setOutroScene: (outroScene) => set({ outroScene }),
      graphicsTier: "medium",
      setGraphicsTier: (graphicsTier) => set({ graphicsTier }),
```

- [ ] **Step 3: Persist both fields**

In the `partialize` return object, add the two keys:

```ts
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        preset: state.preset,
        tokenOverrides: state.tokenOverrides,
        advanced: state.advanced,
        outroScene: state.outroScene,
        graphicsTier: state.graphicsTier,
      }),
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/store/useAppStore.ts
git commit -m "feat(outro): add outroScene + graphicsTier to store"
```

---

### Task 2: Graphics tier logic (pure) — `lib/outro/tiers.ts`

**Files:**
- Create: `web/src/lib/outro/tiers.ts`
- Test: `web/src/lib/outro/tiers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/outro/tiers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveGraphicsTier, atLeast } from "./tiers";

describe("resolveGraphicsTier", () => {
  it("passes the selected tier through on a normal desktop", () => {
    const env = { reducedMotion: false, hasFinePointer: true };
    expect(resolveGraphicsTier("high", env)).toBe("high");
    expect(resolveGraphicsTier("low", env)).toBe("low");
  });

  it("forces 'off' when reduced motion is requested, regardless of pointer", () => {
    expect(resolveGraphicsTier("high", { reducedMotion: true, hasFinePointer: true })).toBe("off");
    expect(resolveGraphicsTier("high", { reducedMotion: true, hasFinePointer: false })).toBe("off");
  });

  it("caps at 'low' when there is no fine pointer (touch)", () => {
    const touch = { reducedMotion: false, hasFinePointer: false };
    expect(resolveGraphicsTier("high", touch)).toBe("low");
    expect(resolveGraphicsTier("medium", touch)).toBe("low");
    expect(resolveGraphicsTier("low", touch)).toBe("low");
    expect(resolveGraphicsTier("off", touch)).toBe("off");
  });
});

describe("atLeast", () => {
  it("compares tiers by rank", () => {
    expect(atLeast("medium", "low")).toBe(true);
    expect(atLeast("low", "medium")).toBe(false);
    expect(atLeast("off", "off")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/lib/outro/tiers.test.ts`
Expected: FAIL — cannot resolve `./tiers`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/outro/tiers.ts`:

```ts
export type GraphicsTier = "off" | "low" | "medium" | "high";

export const TIER_ORDER: GraphicsTier[] = ["off", "low", "medium", "high"];

export interface TierEnv {
  reducedMotion: boolean;
  hasFinePointer: boolean;
}

/** Rank comparison: is `tier` at least `min`? */
export function atLeast(tier: GraphicsTier, min: GraphicsTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

/**
 * Resolve the *effective* tier from the user's selection and the device:
 * reduced-motion wins (→ off); touch devices cap at low (no cursor effects).
 */
export function resolveGraphicsTier(selected: GraphicsTier, env: TierEnv): GraphicsTier {
  if (env.reducedMotion) return "off";
  if (!env.hasFinePointer && atLeast(selected, "medium")) return "low";
  return selected;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run src/lib/outro/tiers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/outro/tiers.ts web/src/lib/outro/tiers.test.ts
git commit -m "feat(outro): pure graphics-tier resolution (reduced-motion + touch caps)"
```

---

### Task 3: Bubble generator (pure) — `lib/outro/bubbles.ts`

**Files:**
- Create: `web/src/lib/outro/bubbles.ts`
- Test: `web/src/lib/outro/bubbles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/outro/bubbles.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateBubbles } from "./bubbles";

const bounds = { width: 800, height: 400 };

describe("generateBubbles", () => {
  it("is deterministic for the same seed", () => {
    expect(generateBubbles(7, 30, bounds)).toEqual(generateBubbles(7, 30, bounds));
  });

  it("differs for a different seed", () => {
    expect(generateBubbles(7, 30, bounds)).not.toEqual(generateBubbles(8, 30, bounds));
  });

  it("produces exactly `count` bubbles", () => {
    expect(generateBubbles(7, 24, bounds)).toHaveLength(24);
  });

  it("keeps every bubble inside sane bounds", () => {
    for (const b of generateBubbles(7, 50, bounds)) {
      expect(b.baseX).toBeGreaterThanOrEqual(0);
      expect(b.baseX).toBeLessThanOrEqual(1);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(bounds.height);
      expect(b.r).toBeGreaterThan(0);
      expect(b.speed).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/lib/outro/bubbles.test.ts`
Expected: FAIL — cannot resolve `./bubbles`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/outro/bubbles.ts`:

```ts
import { mulberry32 } from "@/physics/generateFlasks";

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run src/lib/outro/bubbles.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/outro/bubbles.ts web/src/lib/outro/bubbles.test.ts
git commit -m "feat(outro): seeded bubble generator"
```

---

### Task 4: Sand generator (pure) — `lib/outro/sand.ts`

**Files:**
- Create: `web/src/lib/outro/sand.ts`
- Test: `web/src/lib/outro/sand.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/outro/sand.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateSand, SAND_PALETTE } from "./sand";

describe("generateSand", () => {
  it("is deterministic for the same seed", () => {
    expect(generateSand(23, 40, 5)).toEqual(generateSand(23, 40, 5));
  });

  it("has the requested dimensions (rows × cols)", () => {
    const grid = generateSand(23, 40, 5);
    expect(grid).toHaveLength(5);
    for (const row of grid) expect(row).toHaveLength(40);
  });

  it("only uses colors from the palette", () => {
    const allowed = new Set(SAND_PALETTE);
    for (const row of generateSand(23, 40, 5)) {
      for (const c of row) expect(allowed.has(c)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/lib/outro/sand.test.ts`
Expected: FAIL — cannot resolve `./sand`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/outro/sand.ts`:

```ts
import { mulberry32 } from "@/physics/generateFlasks";

const SAND_TONES = ["#d9c08a", "#d2b87f", "#c9ad72", "#e0caa0"];
const PEBBLE = "#a98f5f";

/** Every color a sand cell can take (tones + the occasional pebble). */
export const SAND_PALETTE = [...SAND_TONES, PEBBLE];

/** Returns a rows × cols grid of hex colors for the pixel-art sea floor. */
export function generateSand(seed: number, cols: number, rows: number): string[][] {
  const rng = mulberry32(seed);
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(rng() < 0.06 ? PEBBLE : SAND_TONES[Math.floor(rng() * SAND_TONES.length)]);
    }
    grid.push(row);
  }
  return grid;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run src/lib/outro/sand.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/outro/sand.ts web/src/lib/outro/sand.test.ts
git commit -m "feat(outro): seeded pixel-art sand generator"
```

---

### Task 5: Kelp generator (pure) — `lib/outro/kelp.ts`

**Files:**
- Create: `web/src/lib/outro/kelp.ts`
- Test: `web/src/lib/outro/kelp.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/outro/kelp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateKelp, KELP_PALETTE } from "./kelp";

describe("generateKelp", () => {
  it("is deterministic for the same seed", () => {
    expect(generateKelp(11, 6)).toEqual(generateKelp(11, 6));
  });

  it("produces exactly `count` strands", () => {
    expect(generateKelp(11, 6)).toHaveLength(6);
  });

  it("gives each strand 3–4 segments of consistent grid width", () => {
    for (const s of generateKelp(11, 6)) {
      expect(s.segments.length).toBeGreaterThanOrEqual(3);
      expect(s.segments.length).toBeLessThanOrEqual(4);
      for (const grid of s.segments) {
        for (const row of grid) expect(row).toHaveLength(s.cols);
      }
    }
  });

  it("only uses palette colors or transparent", () => {
    const allowed = new Set([...KELP_PALETTE, "transparent"]);
    for (const s of generateKelp(11, 6)) {
      for (const grid of s.segments) {
        for (const row of grid) for (const c of row) expect(allowed.has(c)).toBe(true);
      }
    }
  });

  it("positions strands within the floor (leftPct 0..100)", () => {
    for (const s of generateKelp(11, 6)) {
      expect(s.leftPct).toBeGreaterThanOrEqual(0);
      expect(s.leftPct).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run src/lib/outro/kelp.test.ts`
Expected: FAIL — cannot resolve `./kelp`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/outro/kelp.ts`:

```ts
import { mulberry32 } from "@/physics/generateFlasks";

const GREENS = ["#1f6b3a", "#2f8a4d", "#3fa861", "#176030"];

/** Every solid color a kelp cell can take (empty cells are "transparent"). */
export const KELP_PALETTE = GREENS;

export interface KelpStrand {
  id: number;
  /** Horizontal position across the floor, 0..100 (%). */
  leftPct: number;
  /** Rendered strand width in px. */
  widthPx: number;
  /** Pixel columns per segment. */
  cols: number;
  /** Max sway angle in degrees (± this). */
  swayDeg: number;
  /** Sway period in seconds. */
  swayDurS: number;
  /** Bottom→top list of segments; each segment is a rows × cols hex grid. */
  segments: string[][][];
}

export function generateKelp(seed: number, count: number): KelpStrand[] {
  const rng = mulberry32(seed);
  const strands: KelpStrand[] = [];
  for (let i = 0; i < count; i++) {
    const cols = 2;
    const segCount = 3 + Math.floor(rng() * 2); // 3–4
    const rows = 4 + Math.floor(rng() * 2); // 4–5
    const segments: string[][][] = [];
    for (let s = 0; s < segCount; s++) {
      const grid: string[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < cols; c++) {
          const edge = (c === 0 || c === cols - 1) && rng() < 0.2;
          row.push(edge ? "transparent" : GREENS[Math.floor(rng() * GREENS.length)]);
        }
        grid.push(row);
      }
      segments.push(grid);
    }
    strands.push({
      id: i,
      leftPct: 6 + rng() * 88,
      widthPx: 12 + Math.floor(rng() * 8),
      cols,
      swayDeg: 3 + rng() * 4,
      swayDurS: 4 + rng() * 3,
      segments,
    });
  }
  return strands;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npx vitest run src/lib/outro/kelp.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/outro/kelp.ts web/src/lib/outro/kelp.test.ts
git commit -m "feat(outro): seeded pixel-kelp generator"
```

---

### Task 6: `useGraphicsTier` hook

**Files:**
- Create: `web/src/hooks/useGraphicsTier.ts`

(Hook wiring is browser-API driven, verified by typecheck + manual; the logic it delegates to is already unit-tested in Task 2.)

- [ ] **Step 1: Write the hook**

Create `web/src/hooks/useGraphicsTier.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { resolveGraphicsTier, type GraphicsTier } from "@/lib/outro/tiers";

/** The effective scene tier: the user's choice, capped by device + reduced-motion. */
export function useGraphicsTier(): GraphicsTier {
  const selected = useAppStore((s) => s.graphicsTier);
  const [env, setEnv] = useState({ reducedMotion: false, hasFinePointer: true });

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fp = window.matchMedia("(any-pointer: fine)");
    const update = () =>
      setEnv({ reducedMotion: rm.matches, hasFinePointer: fp.matches });
    update();
    rm.addEventListener("change", update);
    fp.addEventListener("change", update);
    return () => {
      rm.removeEventListener("change", update);
      fp.removeEventListener("change", update);
    };
  }, []);

  return resolveGraphicsTier(selected, env);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/useGraphicsTier.ts
git commit -m "feat(outro): useGraphicsTier hook (store + media queries)"
```

---

### Task 7: `useSceneActive` hook

**Files:**
- Create: `web/src/hooks/useSceneActive.ts`

(Uses IntersectionObserver + the Page Visibility API; verified by typecheck + manual — the off-screen/tab-hidden pause is checked in Task 13.)

- [ ] **Step 1: Write the hook**

Create `web/src/hooks/useSceneActive.ts`:

```ts
"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True only when the referenced element is in (or near) the viewport AND the
 * tab is visible — so render loops pause when scrolled away or backgrounded.
 */
export function useSceneActive(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px" },
    );
    io.observe(el);

    const onVisibility = () => setVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);

  return inView && visible;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/hooks/useSceneActive.ts
git commit -m "feat(outro): useSceneActive (in-view + tab-visible gate)"
```

---

### Task 8: Refactor `Footer` → `OutroContent` + `ClassicBackdrop` + `OutroSection`

This preserves today's outro exactly, but behind the new swappable structure. `DeepScene` is wired as a temporary placeholder here and replaced in Task 12.

**Files:**
- Create: `web/src/components/outro/OutroContent.tsx`
- Create: `web/src/components/outro/ClassicBackdrop.tsx`
- Create: `web/src/components/outro/OutroSection.tsx`
- Modify: `web/src/app/[lang]/layout.tsx:5,74`
- Delete: `web/src/components/layout/Footer.tsx`

- [ ] **Step 1: Create `OutroContent.tsx` (shared content, extracted verbatim from Footer's content)**

Create `web/src/components/outro/OutroContent.tsx`:

```tsx
"use client";

import { motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import type { Dictionary } from "@/i18n/types";

const GITHUB_URL = "https://github.com/FireNick44";
const EASE = [0.22, 1, 0.36, 1] as const;

function GithubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

export function OutroContent({ dict }: { dict: Dictionary }) {
  const words = dict.footer.thanks.split(" ");

  return (
    <div
      className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8"
      style={{
        paddingTop: "clamp(7rem, 14vw, 11rem)",
        paddingBottom: "clamp(6.5rem, 12vw, 10rem)",
        textShadow: "0 2px 24px rgba(8,12,40,0.45)",
      }}
    >
      <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "100%", opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-12%" }}
              transition={{ delay: i * 0.06, duration: 0.55, ease: EASE }}
            >
              {w}&nbsp;
            </motion.span>
          </span>
        ))}
      </h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-12%" }}
        transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
        className="mt-5 max-w-md text-current/85"
      >
        {dict.footer.note}
      </motion.p>

      <div className="mt-12 flex flex-col gap-6 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-bold tracking-tight">
            {dict.footer.rights}
          </span>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-current/65">
            {dict.footer.builtWith}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub"
            className="group flex h-10 w-10 items-center justify-center border border-white/25 text-current/80 transition-all duration-300 ease-[var(--ease-lab)] hover:-translate-y-0.5 hover:border-white/70 hover:text-current"
          >
            <GithubMark size={18} />
          </a>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group flex h-10 items-center gap-2 border border-white/25 px-4 text-current/80 transition-colors duration-300 hover:border-white/70 hover:text-current"
          >
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em]">
              {dict.footer.backToTop}
            </span>
            <ArrowUp
              size={15}
              className="transition-transform duration-300 ease-[var(--ease-lab)] group-hover:-translate-y-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `ClassicBackdrop.tsx` (today's backdrop, extracted verbatim from Footer)**

Create `web/src/components/outro/ClassicBackdrop.tsx`:

```tsx
import { WaveDivider } from "@/components/ui/WaveDivider";
import { ByeSand } from "@/components/layout/ByeSand";

export function ClassicBackdrop() {
  return (
    <>
      {/* Darker "ocean" bubbles ending — reuses the hero bubbles, dimmed. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/svg/intro-bg.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      </div>

      <WaveDivider
        fill="var(--background)"
        flip
        className="absolute inset-x-0 top-0 z-[1]"
      />

      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-[clamp(70px,10vw,140px)] w-full" />
    </>
  );
}
```

- [ ] **Step 3: Create `OutroSection.tsx` with a temporary deep placeholder**

Create `web/src/components/outro/OutroSection.tsx`:

```tsx
"use client";

import type { Dictionary } from "@/i18n/types";
import { useAppStore } from "@/store/useAppStore";
import { ClassicBackdrop } from "./ClassicBackdrop";
import { OutroContent } from "./OutroContent";

export default function OutroSection({ dict }: { dict: Dictionary; lang: string }) {
  const scene = useAppStore((s) => s.outroScene);

  return (
    <footer className="relative isolate overflow-hidden text-[#f5f0e6]">
      {scene === "deep" ? (
        // Temporary placeholder — replaced by <DeepScene /> in Task 12.
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#062436]" />
      ) : (
        <ClassicBackdrop />
      )}
      <OutroContent dict={dict} />
    </footer>
  );
}
```

- [ ] **Step 4: Point the layout at `OutroSection`**

In `web/src/app/[lang]/layout.tsx`, change the import on line 5:

```tsx
import OutroSection from "@/components/outro/OutroSection";
```

and the render on line 74:

```tsx
          <OutroSection dict={dict} lang={lang} />
```

- [ ] **Step 5: Delete the old Footer**

```bash
git rm web/src/components/layout/Footer.tsx
```

- [ ] **Step 6: Typecheck + full test run**

Run: `cd web && npx tsc --noEmit && npm test`
Expected: no type errors; all existing + new tests pass.

- [ ] **Step 7: Manual check**

Run `npm run dev`, open `http://localhost:3000/en`, scroll to the bottom. The outro looks **identical to before**. (Scene defaults to `classic`.)

- [ ] **Step 8: Commit**

```bash
git add web/src/components/outro web/src/app/[lang]/layout.tsx
git commit -m "refactor(outro): split Footer into OutroSection + ClassicBackdrop + OutroContent"
```

---

### Task 9: Settings — "Outro scene" controls

**Files:**
- Modify: `web/src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Subscribe to the new store fields**

In `web/src/components/settings/SettingsPanel.tsx`, add alongside the other `useAppStore` selectors (near lines 105–116):

```tsx
  const outroScene = useAppStore((s) => s.outroScene);
  const setOutroScene = useAppStore((s) => s.setOutroScene);
  const graphicsTier = useAppStore((s) => s.graphicsTier);
  const setGraphicsTier = useAppStore((s) => s.setGraphicsTier);
```

- [ ] **Step 2: Add the panel inside the Appearance tab**

In the Appearance tab's container (`<div className="mt-8 space-y-8">`, opened around line 245), add this block immediately after the closing `</div>` of the **Mode** panel (the panel whose `<PanelHead>` is `Mode`, ending around line 291) and before the **Theme presets** panel:

```tsx
          {/* Outro scene */}
          <div className="border border-border">
            <PanelHead>Outro scene</PanelHead>
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="lab-label w-20">Scene</span>
                <div className="flex gap-px bg-border">
                  {(["classic", "deep"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setOutroScene(s)}
                      className={cn(
                        "bg-background px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                        outroScene === s
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s === "classic" ? "Current" : "The Deep"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="lab-label w-20">Graphics</span>
                <div className="flex gap-px bg-border">
                  {(["off", "low", "medium", "high"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setGraphicsTier(t)}
                      className={cn(
                        "bg-background px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                        graphicsTier === t
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Switch the page&apos;s ending between the current outro and the
              interactive underwater scene. Graphics scales the effect — Off
              respects reduced motion; touch devices cap at Low.
            </p>
          </div>
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check**

`npm run dev` → `http://localhost:3000/en/settings` → Appearance tab. The "Outro scene" panel shows Scene (Current/The Deep) and Graphics (off/low/medium/high). Click **The Deep**, scroll to the footer: it's now a flat dark `#062436` block with the text on top (the Task 12 placeholder). Switch back to **Current**: original outro returns. Reload: selection persists.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/settings/SettingsPanel.tsx
git commit -m "feat(outro): settings scene-picker + graphics tier controls"
```

---

### Task 10: `SandFloor` component

**Files:**
- Create: `web/src/components/outro/SandFloor.tsx`

- [ ] **Step 1: Write the component**

Create `web/src/components/outro/SandFloor.tsx`:

```tsx
"use client";

import { generateSand } from "@/lib/outro/sand";

const COLS = 56;
const ROWS = 5;
const SAND = generateSand(23, COLS, ROWS);

export function SandFloor() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 z-[2]"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        imageRendering: "pixelated",
      }}
    >
      {SAND.flat().map((c, i) => (
        <span key={i} style={{ background: c, width: "100%", paddingBottom: "100%" }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/outro/SandFloor.tsx
git commit -m "feat(outro): pixel-art sand floor component"
```

---

### Task 11: `Kelp` component + sway keyframes

**Files:**
- Modify: `web/src/app/globals.css` (append keyframes)
- Create: `web/src/components/outro/Kelp.tsx`

- [ ] **Step 1: Append the sway keyframes to `globals.css`**

Append to the end of `web/src/app/globals.css`:

```css
/* Underwater outro: kelp sway (rotation about the strand base). */
@keyframes kelp-sway {
  0%,
  100% {
    transform: rotate(var(--kelp-from, -4deg));
  }
  50% {
    transform: rotate(var(--kelp-to, 4deg));
  }
}
```

- [ ] **Step 2: Write the component**

Create `web/src/components/outro/Kelp.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { generateKelp } from "@/lib/outro/kelp";

const STRANDS = generateKelp(11, 6);

export function Kelp({ animated }: { animated: boolean }) {
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 z-[3] h-[42%]">
      {STRANDS.map((s) => (
        <div
          key={s.id}
          className="absolute bottom-0 flex flex-col-reverse items-center"
          style={{ left: `${s.leftPct}%`, width: s.widthPx }}
        >
          {s.segments.map((grid, i) => {
            const style: CSSProperties = {
              transformOrigin: "bottom center",
              display: "grid",
              gridTemplateColumns: `repeat(${s.cols}, 1fr)`,
              imageRendering: "pixelated",
              animation: animated
                ? `kelp-sway ${s.swayDurS}s ease-in-out ${
                    (i * s.swayDurS) / (s.segments.length * 2)
                  }s infinite`
                : "none",
              // CSS custom props for the keyframes (typed loosely on purpose).
              ["--kelp-from" as keyof CSSProperties as string]: `${-s.swayDeg}deg`,
              ["--kelp-to" as keyof CSSProperties as string]: `${s.swayDeg}deg`,
            };
            return (
              <div key={i} style={style}>
                {grid.flat().map((c, j) => (
                  <span key={j} style={{ background: c, width: "100%", paddingBottom: "100%" }} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css web/src/components/outro/Kelp.tsx
git commit -m "feat(outro): swaying pixel-kelp component"
```

---

### Task 12: `WaterCanvas` + `DeepScene` (compose, gate, replace placeholder)

**Files:**
- Create: `web/src/components/outro/WaterCanvas.tsx`
- Create: `web/src/components/outro/DeepScene.tsx`
- Modify: `web/src/components/outro/OutroSection.tsx`

- [ ] **Step 1: Write `WaterCanvas` (bubbles only)**

Create `web/src/components/outro/WaterCanvas.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { generateBubbles, type Bubble } from "@/lib/outro/bubbles";

export function WaterCanvas({
  active,
  bubbleCount,
  seed = 7,
}: {
  active: boolean;
  bubbleCount: number;
  seed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || bubbleCount === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bubblesRef.current = generateBubbles(seed, bubbleCount, { width: w, height: h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const b of bubblesRef.current) {
        b.y -= b.speed * dt;
        if (b.y < -b.r) {
          b.y = h + b.r;
          b.baseX = Math.random();
        }
        const x = b.baseX * w + Math.sin((now / 1000) * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 235, ${0.08 + Math.min(b.r, 6) * 0.03})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(210, 240, 250, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [active, bubbleCount, seed]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />;
}
```

- [ ] **Step 2: Write `DeepScene`**

Create `web/src/components/outro/DeepScene.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import type { GraphicsTier } from "@/lib/outro/tiers";
import { WaterCanvas } from "./WaterCanvas";
import { Kelp } from "./Kelp";
import { SandFloor } from "./SandFloor";

const BUBBLE_COUNT: Record<GraphicsTier, number> = {
  off: 0,
  low: 24,
  medium: 40,
  high: 70,
};

export function DeepScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tier = useGraphicsTier();
  const active = useSceneActive(containerRef);
  const animated = tier !== "off";

  return (
    <div ref={containerRef} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* Deepest layer: the existing bubble SVG, recolored to deep water. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/svg/intro-bg.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "hue-rotate(190deg) saturate(1.4) brightness(0.5)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#04121f]/70 via-[#062436]/80 to-[#01243a]/90" />

      <WaterCanvas active={active && animated} bubbleCount={BUBBLE_COUNT[tier]} />
      <Kelp animated={animated} />
      <SandFloor />
    </div>
  );
}
```

- [ ] **Step 3: Replace the placeholder in `OutroSection`**

In `web/src/components/outro/OutroSection.tsx`, add the import:

```tsx
import { DeepScene } from "./DeepScene";
```

and replace the placeholder `<div>` with the real scene:

```tsx
      {scene === "deep" ? <DeepScene /> : <ClassicBackdrop />}
```

- [ ] **Step 4: Typecheck + full test run**

Run: `cd web && npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 5: Manual check**

`npm run dev` → `/en/settings` → set Scene = **The Deep**, Graphics = **medium**. Scroll to the footer:
- deep blue recolored water with bubbles **rising** from the bottom,
- pixel **kelp swaying** from the floor,
- a **pixel sand** strip along the very bottom,
- "Thanks for stopping by." + footer chrome legible on top.

Set Graphics = **off**: bubbles stop, kelp freezes (static scene). Set **low/high**: bubble density changes.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/outro/WaterCanvas.tsx web/src/components/outro/DeepScene.tsx web/src/components/outro/OutroSection.tsx
git commit -m "feat(outro): DeepScene compose (bubbles + kelp + sand), tier + active gated"
```

---

### Task 13: Verification pass (fallbacks, gating, themes, cleanup)

**Files:** none (verification + any small fixes uncovered).

- [ ] **Step 1: Full automated gate**

Run: `cd web && npx tsc --noEmit && npm test`
Expected: clean typecheck; all tests pass.

- [ ] **Step 2: Reduced-motion fallback**

In DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce". With Scene = The Deep and Graphics = high, the scene must be **static** (no bubbles, no kelp sway) — effective tier is forced to `off`. The heading + chrome stay legible.

- [ ] **Step 3: Off-screen / tab-hidden pause**

With Scene = The Deep, Graphics = medium: scroll the footer out of view, then back — bubbles resume. Switch to another browser tab for a few seconds, return — the loop resumes cleanly (no stutter pile-up). (Confirms `useSceneActive` gating + rAF cleanup.)

- [ ] **Step 4: Both themes legible**

Toggle light/dark theme (header toggle or `/settings`). In both, the deep-water wash keeps the light outro text readable.

- [ ] **Step 5: Touch cap (optional, if a device/emulator is handy)**

In an emulated touch device (no fine pointer), Graphics = high resolves to **low** behavior (ambient only). Not blocking if no emulator is available — the logic is unit-tested in Task 2.

- [ ] **Step 6: No leaked loops**

In DevTools Performance, confirm that switching Scene back to **Current** stops the canvas work (no ongoing rAF from the unmounted `WaterCanvas`).

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "test(outro): phase 1 verification pass"
```
(If no fixes were needed, skip this commit.)

---

## Self-Review

**Spec coverage (against `2026-05-22-underwater-outro-design.md`):**
- §3 keep recolored `intro-bg.svg` for depth → Task 12 (DeepScene bg with filter + wash). ✅
- §3 no wave divider into deep → DeepScene has no `WaveDivider`; gradient wash instead. ✅ (ClassicBackdrop keeps its WaveDivider, correct.)
- §3 heading stays focal, chrome legible → `OutroContent` rendered at `z-10` over the scene. ✅
- §4 hybrid DOM + canvas, z-stack, in-view + tab-visible gating → WaterCanvas (canvas) + DOM sand/kelp; `useSceneActive`. ✅
- §5 settings scene picker + graphics tier, classic default → Task 9; store defaults `classic`/`medium`. ✅
- §6 tiers (Off/Low/Medium/High), reduced-motion=Off, touch caps Low, mobile default Low via cap → `resolveGraphicsTier` (Task 2) + `BUBBLE_COUNT` map (Task 12). ✅
- §10 generated assets, no external art in Phase 1 → sand/kelp/bubbles generators; bg reuses existing svg. ✅
- §11 capped counts, dpr cap, cleanup → BUBBLE_COUNT caps, `dpr` ≤ 2, effect cleanup. ✅
- §12 reduced-motion/touch/aria-hidden/pointer-events-none → tier resolution + `aria-hidden` + `pointer-events-none` canvas. ✅
- §14 vitest + tsc, not `next build` → Conventions + every task. ✅
- **Out of Phase 1 (deferred to Phase 2/3, by design):** custom cursor (trail/repel/ripple), creatures (octopus/mosasaurus), coral, MotionGrid "NS" motif. Tracked below.

**Placeholder scan:** No "TBD/TODO"; the only "placeholder" is the deliberate, code-complete Task 8 stub that Task 12 removes. ✅

**Type consistency:** `GraphicsTier` used identically across `tiers.ts`, `useGraphicsTier.ts`, `DeepScene.tsx`. `Bubble` shape (`baseX`, `y`, `r`, `speed`, `wobble*`) matches between `bubbles.ts` and `WaterCanvas.tsx`. `KelpStrand` (`segments`, `cols`, `leftPct`, `widthPx`, `swayDeg`, `swayDurS`) matches between `kelp.ts` and `Kelp.tsx`. `generateSand(seed, cols, rows)` call order matches in `SandFloor.tsx`. ✅

---

## Phases 2 & 3 (separate plans, after Phase 1 lands)

- **Phase 2 — Cursor magic (Medium tier):** `usePointerField` hook; extend `WaterCanvas` with cursor bubble-trail + repel + ripple; `CursorLayer` via animate-ui `Cursor`/`CursorFollow` (`npx shadcn@latest add @animate-ui/components-animate-cursor`), desktop-only; octopus creature follows the cursor. Needs the octopus GIF (transparent bg) → `web/public/underwater/`.
- **Phase 3 — Escalations (High tier):** `SwimmingCreature` on motion paths (mosasaurus slow cruise); `Coral` (PNG + sway); `PixelSignoff` "NS" motif via animate-ui `MotionGrid` (`npx shadcn@latest add @animate-ui/primitives-animate-motion-grid`) or CSS-grid fallback; other-fish flee-from-cursor. Needs mosasaurus GIF + coral PNG.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-22-underwater-outro-phase1.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
