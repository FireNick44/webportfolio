# Underwater Outro — Phase 2 (Cursor Magic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add desktop cursor interactivity to the underwater outro at **Medium+** graphics tier: a bubble trail at the pointer, bubbles + water repelling from the cursor, expanding ripple rings on fast movement, and a creature (placeholder octopus) that lazily follows the mouse and darts off on quick moves.

**Architecture:** A `usePointerField` hook tracks the pointer in scene-local coordinates (via `window` listeners, so z-index/`pointer-events` never block it). `WaterCanvas` gains optional cursor behavior (trail/repel/ripple) layered onto its existing bubble loop. A `CursorFollower` element lerps toward the pointer. `DeepScene` enables all of this only when the effective tier is `medium` or `high` (so reduced-motion=off, touch=low, and Low tier stay ambient — exactly Phase 1). All pure math is unit-tested; the rAF/DOM glue is verified by typecheck + DOM inspection + manual.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Canvas 2D, `requestAnimationFrame`, Pointer Events. No new npm dependency (the cursor follower is hand-built, equivalent to animate-ui's `CursorFollow`).

---

## Conventions (same as Phase 1)
- Run `npm`/`npx` from `web/`. Gate on `npx tsc --noEmit` + `npm test`. Never `next build`.
- **Vitest has no path alias** → modules reachable from a `*.test.ts` use **relative** imports. Components/hooks (not test-reached) may use `@/`.
- Don't open a browser to verify motion — rAF/CSS-animation are throttled in a hidden tab. *Layout/DOM* (element presence, sizes, applied styles) IS observable; motion playback is a human check.
- Branch: same as Phase 1 work.
- These already exist from Phase 1: `WaterCanvas.tsx`, `DeepScene.tsx`, `Kelp.tsx`, `SandFloor.tsx`, `lib/outro/{bubbles,tiers}.ts`, `hooks/{useGraphicsTier,useSceneActive}.ts`. `tiers.ts` exports `atLeast(tier, min)`.

## File structure (Phase 2)
```
web/src/
├── lib/outro/
│   ├── cursorPhysics.ts        # CREATE: repel(), advanceRipple(), lerp(), Ripple (pure)
│   └── cursorPhysics.test.ts   # CREATE
├── hooks/
│   └── usePointerField.ts      # CREATE: scene-local pointer pos + velocity + over-scene flag
├── components/outro/
│   ├── CursorFollower.tsx       # CREATE: element that lerps toward the pointer (placeholder octopus)
│   ├── WaterCanvas.tsx          # MODIFY: optional pointer trail + repel + ripple
│   └── DeepScene.tsx            # MODIFY: wire pointer field + enable cursor at medium+
└── public/underwater/           # (asset folder; real octopus.gif dropped here later)
```

---

### Task 1: `cursorPhysics.ts` — pure math (TDD)

**Files:** Create `web/src/lib/outro/cursorPhysics.ts` + `web/src/lib/outro/cursorPhysics.test.ts`

- [ ] **Step 1 — failing test** `web/src/lib/outro/cursorPhysics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { repel, advanceRipple, lerp } from "./cursorPhysics";

describe("repel", () => {
  it("returns zero push outside the radius", () => {
    expect(repel(0, 0, 100, 0, 50, 10)).toEqual({ dx: 0, dy: 0 });
  });
  it("pushes the point away from the cursor when inside the radius", () => {
    // point at (10,0), cursor at (0,0): push is in +x.
    const { dx, dy } = repel(10, 0, 0, 0, 50, 10);
    expect(dx).toBeGreaterThan(0);
    expect(Math.abs(dy)).toBeLessThan(1e-9);
  });
  it("pushes harder the closer the point is", () => {
    const near = repel(5, 0, 0, 0, 50, 10).dx;
    const far = repel(40, 0, 0, 0, 50, 10).dx;
    expect(near).toBeGreaterThan(far);
  });
});

describe("advanceRipple", () => {
  it("grows the radius and fades the alpha over time", () => {
    const next = advanceRipple({ x: 1, y: 2, r: 4, alpha: 0.5 }, 0.1, 60, 0.6);
    expect(next.r).toBeCloseTo(10);
    expect(next.alpha).toBeCloseTo(0.44);
    expect(next.x).toBe(1);
    expect(next.y).toBe(2);
  });
});

describe("lerp", () => {
  it("interpolates between a and b", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});
```

- [ ] **Step 2 — run, expect FAIL:** `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/outro/cursorPhysics.test.ts`

- [ ] **Step 3 — implement** `web/src/lib/outro/cursorPhysics.ts`:

```ts
export interface Ripple {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

/**
 * Push vector moving a point at (px,py) away from a cursor at (cx,cy).
 * Zero outside `radius`; scales linearly with closeness × `strength`.
 */
export function repel(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
  strength: number,
): { dx: number; dy: number } {
  const dx = px - cx;
  const dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius || d2 < 1e-6) return { dx: 0, dy: 0 };
  const d = Math.sqrt(d2);
  const f = (1 - d / radius) * strength;
  return { dx: (dx / d) * f, dy: (dy / d) * f };
}

/** Expand + fade a ripple ring by one timestep. */
export function advanceRipple(r: Ripple, dt: number, growth: number, fade: number): Ripple {
  return { x: r.x, y: r.y, r: r.r + growth * dt, alpha: r.alpha - fade * dt };
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

- [ ] **Step 4 — run, expect PASS** (7 assertions across 3 suites); also `npx tsc --noEmit`.
- [ ] **Step 5 — commit:** `git add web/src/lib/outro/cursorPhysics.ts web/src/lib/outro/cursorPhysics.test.ts && git commit -m "feat(outro): pure cursor physics (repel, ripple, lerp)"`

---

### Task 2: `usePointerField` hook

**Files:** Create `web/src/hooks/usePointerField.ts`

- [ ] **Step 1 — implement:**

```ts
"use client";

import { useEffect, useRef, type RefObject } from "react";

export interface PointerField {
  /** Pointer X in pixels, local to the container's top-left. */
  x: number;
  /** Pointer Y in pixels, local to the container's top-left. */
  y: number;
  /** Horizontal velocity (px/frame-ish). */
  vx: number;
  /** Vertical velocity. */
  vy: number;
  /** True while the pointer is over the container's bounds. */
  active: boolean;
}

/**
 * Tracks the pointer in coordinates local to `containerRef`, using window-level
 * listeners so it works regardless of z-index / pointer-events on the scene.
 * Returns a ref (no re-renders) for rAF consumers to read each frame.
 */
export function usePointerField(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): RefObject<PointerField> {
  const field = useRef<PointerField>({ x: 0, y: 0, vx: 0, vy: 0, active: false });

  useEffect(() => {
    if (!enabled) {
      field.current.active = false;
      return;
    }
    const onMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      field.current.vx = x - field.current.x;
      field.current.vy = y - field.current.y;
      field.current.x = x;
      field.current.y = y;
      field.current.active = inside;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [containerRef, enabled]);

  return field;
}
```

- [ ] **Step 2 — typecheck:** `npx tsc --noEmit`.
- [ ] **Step 3 — commit:** `git add web/src/hooks/usePointerField.ts && git commit -m "feat(outro): usePointerField (scene-local pointer + velocity)"`

---

### Task 3: `CursorFollower` component (placeholder octopus)

**Files:** Create `web/src/components/outro/CursorFollower.tsx`

- [ ] **Step 1 — implement:**

```tsx
"use client";

import { useEffect, useRef, type RefObject } from "react";
import { lerp } from "@/lib/outro/cursorPhysics";
import type { PointerField } from "@/hooks/usePointerField";

/**
 * A creature that lazily follows the pointer (lerp → trailing lag, so fast
 * mouse moves make it "dart" to catch up). Hidden when the pointer leaves the
 * scene. Placeholder visual is an emoji; swap the marked node for
 * <img src="/underwater/octopus.gif" .../> once the real asset lands.
 */
export function CursorFollower({ pointer }: { pointer: RefObject<PointerField | null> }) {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const pos = useRef({ x: 0, y: 0, init: false });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const frame = () => {
      const p = pointer.current;
      if (p) {
        if (!pos.current.init) {
          pos.current.x = p.x;
          pos.current.y = p.y;
          pos.current.init = true;
        }
        pos.current.x = lerp(pos.current.x, p.x, 0.08);
        pos.current.y = lerp(pos.current.y, p.y, 0.08);
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
        el.style.opacity = p.active ? "1" : "0";
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pointer]);

  return (
    <div
      ref={elRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[5] select-none text-3xl leading-none transition-opacity duration-300"
      style={{ willChange: "transform", opacity: 0 }}
    >
      {/* PLACEHOLDER octopus — replace this emoji node with
          <img src="/underwater/octopus.gif" alt="" width={48} height={48} /> later. */}
      🐙
    </div>
  );
}
```

- [ ] **Step 2 — typecheck.** **Step 3 — commit:** `git add web/src/components/outro/CursorFollower.tsx && git commit -m "feat(outro): CursorFollower (lerp-following placeholder creature)"`

---

### Task 4: Extend `WaterCanvas` with trail + repel + ripple

**Files:** Modify `web/src/components/outro/WaterCanvas.tsx` (replace the whole file). Backward compatible: with no `pointer`/`enableCursor`, behavior is identical to Phase 1.

- [ ] **Step 1 — replace file contents:**

```tsx
"use client";

import { useEffect, useRef, type RefObject } from "react";
import { generateBubbles, type Bubble } from "@/lib/outro/bubbles";
import { repel, advanceRipple, type Ripple } from "@/lib/outro/cursorPhysics";
import type { PointerField } from "@/hooks/usePointerField";

export function WaterCanvas({
  active,
  bubbleCount,
  seed = 7,
  pointer,
  enableCursor = false,
}: {
  active: boolean;
  bubbleCount: number;
  seed?: number;
  pointer?: RefObject<PointerField | null>;
  enableCursor?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const trailAccum = useRef(0);

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

      const p = enableCursor ? pointer?.current : null;
      const cursorOn = !!p && p.active;

      // Cursor: spawn a rising bubble trail + ripple rings on movement.
      if (cursorOn) {
        const speed = Math.hypot(p.vx, p.vy);
        trailAccum.current += dt;
        if (trailAccum.current > 0.04 && speed > 1.5) {
          trailAccum.current = 0;
          bubblesRef.current.push({
            id: -1,
            baseX: p.x / w,
            y: p.y,
            r: 1.5 + Math.random() * 2,
            speed: 30 + Math.random() * 30,
            wobbleAmp: 4,
            wobbleFreq: 2,
            wobblePhase: Math.random() * Math.PI * 2,
          });
          if (bubblesRef.current.length > bubbleCount + 40) bubblesRef.current.shift();
        }
        if (speed > 6 && ripplesRef.current.length < 14) {
          ripplesRef.current.push({ x: p.x, y: p.y, r: 4, alpha: 0.32 });
        }
      }

      // Bubbles (with optional cursor repel).
      for (const b of bubblesRef.current) {
        b.y -= b.speed * dt;
        if (b.y < -b.r) {
          b.y = h + b.r;
          b.baseX = Math.random();
        }
        let x = b.baseX * w + Math.sin((now / 1000) * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp;
        if (cursorOn) {
          const { dx, dy } = repel(x, b.y, p.x, p.y, 90, 14);
          x += dx;
          b.y += dy;
        }
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 220, 235, ${0.08 + Math.min(b.r, 6) * 0.03})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(210, 240, 250, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Ripple rings.
      if (ripplesRef.current.length) {
        for (const r of ripplesRef.current) {
          const n = advanceRipple(r, dt, 70, 0.7);
          r.r = n.r;
          r.alpha = n.alpha;
          if (r.alpha > 0) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 235, 245, ${r.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
        ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0);
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [active, bubbleCount, seed, pointer, enableCursor]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />;
}
```

- [ ] **Step 2 — gates:** `npx tsc --noEmit && npm test` (expect all green; Phase 1 behavior unchanged when `enableCursor` is false).
- [ ] **Step 3 — commit:** `git add web/src/components/outro/WaterCanvas.tsx && git commit -m "feat(outro): WaterCanvas cursor trail + repel + ripple"`

---

### Task 5: Wire cursor into `DeepScene`

**Files:** Modify `web/src/components/outro/DeepScene.tsx`

- [ ] **Step 1 — replace file contents:**

```tsx
"use client";

import { useRef } from "react";
import { useGraphicsTier } from "@/hooks/useGraphicsTier";
import { useSceneActive } from "@/hooks/useSceneActive";
import { usePointerField } from "@/hooks/usePointerField";
import { atLeast, type GraphicsTier } from "@/lib/outro/tiers";
import { WaterCanvas } from "./WaterCanvas";
import { CursorFollower } from "./CursorFollower";
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
  const cursorOn = atLeast(tier, "medium") && active;
  const pointer = usePointerField(containerRef, cursorOn);

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

      <WaterCanvas
        active={active && animated}
        bubbleCount={BUBBLE_COUNT[tier]}
        pointer={pointer}
        enableCursor={cursorOn}
      />
      <Kelp animated={animated} />
      <SandFloor />
      {cursorOn && <CursorFollower pointer={pointer} />}
    </div>
  );
}
```

- [ ] **Step 2 — gates:** `npx tsc --noEmit && npm test` (all green).
- [ ] **Step 3 — commit:** `git add web/src/components/outro/DeepScene.tsx && git commit -m "feat(outro): enable cursor magic + follower at medium+ tier"`

---

### Task 6: Asset folder + verification

**Files:** Create `web/public/underwater/.gitkeep` (so the asset folder exists for the real GIF later).

- [ ] **Step 1** — `mkdir -p web/public/underwater && touch web/public/underwater/.gitkeep`
- [ ] **Step 2 — gates:** `cd web && npx tsc --noEmit && npm test` (all green).
- [ ] **Step 3 — DOM verification (controller, read-only):** with scene=deep + tier=medium, confirm the `CursorFollower` node (z-5) is mounted and `WaterCanvas` still present; confirm Low/Off tiers do NOT mount the follower.
- [ ] **Step 4 — manual (human, real browser):** at Medium, hovering the outro shows a bubble trail, bubbles parting around the cursor, ripple rings on fast moves, and the octopus placeholder following with lag; at Low/Off and on touch, none of that appears (ambient only).
- [ ] **Step 5 — commit:** `git add web/public/underwater/.gitkeep && git commit -m "chore(outro): add underwater asset folder"`

---

## Self-Review
- **Spec coverage:** cursor bubble-trail (Task 4), repel (Task 4), ripple (Task 4), creature-follow (Task 3 + 5), Medium-default/High gating + reduced-motion=off + touch=low all flow through `cursorOn = atLeast(tier,"medium") && active` (Task 5) reusing Phase-1 `useGraphicsTier`. ✅
- **Backward compatibility:** `WaterCanvas` cursor params are optional; Phase 1 callers/behavior unchanged. ✅
- **Placeholder scan:** the only placeholder is the deliberate, documented octopus emoji (real-asset swap is one node) — not an incomplete step. ✅
- **Type consistency:** `PointerField` (x,y,vx,vy,active) consistent across `usePointerField`, `WaterCanvas`, `CursorFollower`; `Ripple` consistent between `cursorPhysics` and `WaterCanvas`; `atLeast` reused from `tiers.ts`. ✅
- **Vitest imports:** only `cursorPhysics.test.ts` runs under vitest and imports `./cursorPhysics` (relative) — clean. ✅

## Deferred to Phase 3
Mosasaurus slow cruise, coral (PNG + sway), the "NS" pixel motif, other-fish flee-from-cursor. Real `octopus.gif` (transparent bg) → `web/public/underwater/`, swapped into `CursorFollower`.

## Execution Handoff
Same as Phase 1: **Subagent-Driven (recommended)** or **Inline**. Before executing, confirm the commit policy given the concurrent-agent situation (commit per task vs. keep uncommitted).
