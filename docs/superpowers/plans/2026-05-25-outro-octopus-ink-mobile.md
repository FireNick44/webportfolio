# Outro Octopus — Mobile Scare, Ink & Crab/Wave Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile-tap scare + harassment-driven ink release for the outro octopus, plus a mobile crab/wave positioning fix.

**Architecture:** A new pure helper module (`lib/outro/ink.ts`, unit-tested) holds tap classification + tuning. `ReefScene` adds document-level passive touch listeners (tap-vs-scroll guarded) that write the latest valid tap into `tapRef`, renders a new imperative `<InkCloud>` (CSS blobs, `z-7`), and passes `tapRef`/`inkRef` to `Octopus`. `Octopus` extends its existing `scare` with an `annoy` meter; crossing the panic/ink threshold emits an ink puff at its underside and bolts (cooldown-gated).

**Tech Stack:** Next 16 / React 19 client components, rAF animation, CSS keyframes, vitest (node). Branch `feature/underwater-outro` (shared — stage only the files each task names; never `git commit -a`).

**Constraints (verification):**
- Test env is node-only vitest, `src/**/*.test.ts` only — **no jsdom/RTL**. Only pure `.ts` logic is unit-testable.
- The in-session Chrome tab is hidden → **rAF is paused**, so octopus motion / tap-triggered ink can't be visually verified in-session (per project memory). Hard gates: `tsc` + `vitest` + `next build`. Static CSS positions (Part 1 vertical offsets) are screenshot-verifiable; `InkCloud`'s render path is DOM-verifiable by calling `emit` directly. The rAF-bound trigger feel is tuned by the user on a real device.

---

## File Structure

- **Create** `web/src/lib/outro/ink.ts` — pure tap classification + tuning constants.
- **Create** `web/src/lib/outro/ink.test.ts` — unit tests for the above.
- **Create** `web/src/components/outro/InkCloud.tsx` — imperative CSS ink-puff renderer (`z-7`).
- **Modify** `web/src/app/globals.css` — `@keyframes ink-bloom`.
- **Modify** `web/src/components/outro/Octopus.tsx` — `tapRef`/`inkRef` props, `annoy` meter, ink emit.
- **Modify** `web/src/components/outro/ReefScene.tsx` — refs, touch listeners, render `InkCloud`, wire props, wave mobile shift.
- **Modify** `web/src/components/outro/Crab.tsx` — mobile `bottom` offset.

---

## Task 1: Pure tap/ink helpers (TDD)

**Files:**
- Create: `web/src/lib/outro/ink.ts`
- Test: `web/src/lib/outro/ink.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/outro/ink.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { isTap, classifyTap, annoyForTap, ANNOY_INK } from "./ink";

describe("isTap (tap vs scroll)", () => {
  it("brief + still = tap", () => expect(isTap(200, 5)).toBe(true));
  it("too long = not a tap (scroll hold)", () => expect(isTap(300, 5)).toBe(false));
  it("moved too far = not a tap (scroll drag)", () => expect(isTap(200, 20)).toBe(false));
  it("boundaries inclusive", () => expect(isTap(250, 10)).toBe(true));
});

describe("classifyTap", () => {
  it("on him within hit radius", () => {
    expect(classifyTap(50)).toBe("on");
    expect(classifyTap(70)).toBe("on");
  });
  it("around him within scare radius", () => {
    expect(classifyTap(120)).toBe("around");
    expect(classifyTap(180)).toBe("around");
  });
  it("miss beyond scare radius", () => expect(classifyTap(300)).toBe("miss"));
});

describe("annoyForTap", () => {
  it("two on-taps reach the ink threshold", () =>
    expect(annoyForTap("on") * 2).toBeGreaterThanOrEqual(ANNOY_INK));
  it("around < on, miss = 0", () => {
    expect(annoyForTap("around")).toBeLessThan(annoyForTap("on"));
    expect(annoyForTap("miss")).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/outro/ink.test.ts`
Expected: FAIL — cannot resolve `./ink`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/outro/ink.ts`:
```typescript
// Tap classification + annoyance tuning for the outro octopus.

export const INK_HIT_R = 70; // tap within this of the mass-centre = "on him"
export const SCARE_TAP_R = 180; // tap within this (outside INK_HIT_R) = "around"
export const ANNOY_ON = 0.5; // meter add per on-him tap (2 → ink)
export const ANNOY_AROUND = 0.18; // meter add per around tap
export const ANNOY_INK = 1.0; // meter threshold to emit ink (mobile path)
export const ANNOY_DECAY = 0.35; // meter decay per second when left alone
export const INK_DROP = 30; // px below mass-centre = ink origin (his underside)
export const TAP_MAX_MS = 250; // tap vs scroll: max touch duration
export const TAP_MAX_MOVE = 10; // px: max movement to still count as a tap

export type TapClass = "on" | "around" | "miss";

/** A touch is a tap (not a scroll/drag) only if it was brief and barely moved. */
export function isTap(durationMs: number, movePx: number): boolean {
  return durationMs <= TAP_MAX_MS && movePx <= TAP_MAX_MOVE;
}

/** Classify a tap by its distance to the octopus mass-centre. */
export function classifyTap(dist: number): TapClass {
  if (dist <= INK_HIT_R) return "on";
  if (dist <= SCARE_TAP_R) return "around";
  return "miss";
}

/** Annoyance the octopus gains from a tap of the given class. */
export function annoyForTap(cls: TapClass): number {
  if (cls === "on") return ANNOY_ON;
  if (cls === "around") return ANNOY_AROUND;
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/outro/ink.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/lib/outro/ink.ts web/src/lib/outro/ink.test.ts
git commit -m "feat(outro): tap classification + ink tuning helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Crab + wave mobile positioning (Part 1)

**Files:**
- Modify: `web/src/components/outro/Crab.tsx`
- Modify: `web/src/components/outro/ReefScene.tsx`

- [ ] **Step 1: Lower the crabs on mobile**

In `web/src/components/outro/Crab.tsx`, both `<img>` blocks use the class string
`"pointer-events-none absolute bottom-[44px] left-0 z-[6]"`. Replace **both occurrences**
of `bottom-[44px]` with `bottom-[24px] sm:bottom-[44px]` (mobile walks lower; desktop
unchanged):
```
className="pointer-events-none absolute bottom-[24px] sm:bottom-[44px] left-0 z-[6]"
```

- [ ] **Step 2: Lower the wave on mobile**

In `web/src/components/outro/ReefScene.tsx`, the `ByeSand` element (~line 79):
```tsx
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-[clamp(135px,17vw,195px)] w-full opacity-95" />
```
Add `translate-y-[14px] sm:translate-y-0` so the crest sits lower on mobile only:
```tsx
      <ByeSand className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-[clamp(135px,17vw,195px)] w-full translate-y-[14px] opacity-95 sm:translate-y-0" />
```

- [ ] **Step 3: Build + screenshot-verify the vertical positions (mobile width)**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web && npm run build 2>&1 | tail -3
```
Expected: build OK. (The `bottom`/`translate-y` offsets are static CSS — verify by eye
on a narrow viewport; the exact px are tunable. Horizontal crab walk is rAF, not
screenshot-verifiable in the hidden tab.)

- [ ] **Step 4: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/components/outro/Crab.tsx web/src/components/outro/ReefScene.tsx
git commit -m "fix(outro): lower crab path + wave on mobile so they sit on the floor

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: InkCloud component + keyframe

**Files:**
- Create: `web/src/components/outro/InkCloud.tsx`
- Modify: `web/src/app/globals.css`

- [ ] **Step 1: Add the ink-bloom keyframe**

In `web/src/app/globals.css`, after the existing `@keyframes rook-cruise { ... }` block,
add:
```css
/* Underwater outro: octopus ink puff — grows, drifts up, fades. */
@keyframes ink-bloom {
  0% {
    transform: scale(0.2) translateY(0);
    opacity: 0;
  }
  15% {
    opacity: 0.75;
  }
  100% {
    transform: scale(1.6) translateY(-18px);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Create the InkCloud component**

Create `web/src/components/outro/InkCloud.tsx`:
```tsx
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
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/yannic/dev/webportfolio/web && npx tsc --noEmit && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/components/outro/InkCloud.tsx web/src/app/globals.css
git commit -m "feat(outro): InkCloud — CSS ink puffs behind the octopus (z-7)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Octopus — tap consumption, annoy meter, ink emit

**Files:**
- Modify: `web/src/components/outro/Octopus.tsx`

- [ ] **Step 1: Add imports**

In `web/src/components/outro/Octopus.tsx`, after the existing import of `useAppStore`
(line ~5), add:
```typescript
import type { InkHandle } from "./InkCloud";
import { classifyTap, annoyForTap, ANNOY_INK, ANNOY_DECAY, INK_DROP } from "@/lib/outro/ink";
```

- [ ] **Step 2: Extend the props**

Replace the signature:
```typescript
export function Octopus({ pointer }: { pointer: RefObject<PointerField | null> }) {
```
with:
```typescript
export function Octopus({
  pointer,
  tapRef,
  inkRef,
}: {
  pointer: RefObject<PointerField | null>;
  tapRef: RefObject<{ x: number; y: number; t: number } | null>;
  inkRef: RefObject<InkHandle | null>;
}) {
```

- [ ] **Step 3: Add meter fields to the state ref**

In the `useRef({ ... })` initializer, add three fields to the object (e.g. after
`trail: [] as number[],`):
```typescript
    annoy: 0, inkCooldownUntil: 0, lastTapT: 0,
```

- [ ] **Step 4: Consume taps + decay annoy (after the cursor scare calc)**

Immediately after the existing scare block:
```typescript
      if (cActive && !idle && dist < SCARE_R) st.scare += (1 - dist / SCARE_R) * SCARE_GAIN * dt;
      else st.scare = Math.max(0, st.scare - SCARE_DECAY * dt);
```
insert:
```typescript
      // Mobile taps feed the same scare/ink machinery (no cursor on touch).
      const tap = tapRef.current;
      if (tap && tap.t > st.lastTapT) {
        st.lastTapT = tap.t;
        const tdist = Math.hypot(tap.x - st.x, tap.y - st.y) || 0.01;
        const cls = classifyTap(tdist);
        if (cls !== "miss") {
          st.annoy += annoyForTap(cls);
          // Dart away from the tap: direct velocity impulse + scare bump.
          st.vx += ((st.x - tap.x) / tdist) * 900;
          st.vy += ((st.y - tap.y) / tdist) * 900;
          st.scare += cls === "on" ? 0.8 : 0.4;
        }
      }
      st.annoy = Math.max(0, st.annoy - ANNOY_DECAY * dt);
```

- [ ] **Step 5: Emit ink at the panic/ink threshold + bolt**

Replace the existing hide-trigger block (inside `mode === "wander"`, the non-idle branch):
```typescript
          if (st.scare >= SCARE_TRIGGER) {
            st.mode = "hide";
            st.hideUntil = now + HIDE_MIN + Math.random() * HIDE_RAND;
            const goRight = cActive ? cx < st.x : Math.random() < 0.5;
            st.hideX = goRight ? W + 280 : -280;
            st.hideY = H * (0.7 + Math.random() * 0.25);
          }
```
with:
```typescript
          if (st.scare >= SCARE_TRIGGER || st.annoy >= ANNOY_INK) {
            // Harassed enough → ink (cooldown-gated) at his underside, then bolt.
            if (now >= st.inkCooldownUntil) {
              inkRef.current?.emit(st.x, st.y + INK_DROP);
              st.inkCooldownUntil = now + HIDE_MIN;
            }
            st.annoy = 0;
            st.mode = "hide";
            st.hideUntil = now + HIDE_MIN + Math.random() * HIDE_RAND;
            const goRight = cActive ? cx < st.x : Math.random() < 0.5;
            st.hideX = goRight ? W + 280 : -280;
            st.hideY = H * (0.7 + Math.random() * 0.25);
          }
```

- [ ] **Step 6: Remove the top clamp so he can be pushed out of the window**

When the cursor hunts the octopus upward he currently jams against a top wall
(`H * 0.12`), looking stuck. Let him flee out any edge instead. Delete this block:
```typescript
      // Only keep it from leaving the top of the scene — it renders behind the
      // heading (lower z), so it's free to roam the whole water column.
      st.y = Math.max(H * 0.12, st.y);
```
(The wander targets `SPOTS` keep `y` in 0.45–0.85 of the scene during normal drift, so
removing the clamp only frees the transient avoid/flee push — he naturally drifts back
down to his haunts afterward. Horizontal flee already exits off-screen via `hide`.)

- [ ] **Step 7: Verify it compiles**

Run: `cd /Users/yannic/dev/webportfolio/web && npx tsc --noEmit && echo OK`
Expected: `OK`. (Octopus now requires `tapRef`/`inkRef` — `ReefScene` supplies them in
Task 5; if `tsc` flags the call site, that's expected until Task 5 is done. Run this
check again at the end of Task 5.)

- [ ] **Step 8: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/components/outro/Octopus.tsx
git commit -m "feat(outro): octopus annoy meter + ink emit; let it flee out any edge

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: ReefScene — refs, touch listeners, wire it up

**Files:**
- Modify: `web/src/components/outro/ReefScene.tsx`

- [ ] **Step 1: Add imports**

After the existing `import { Crab } from "./Crab";` line, add:
```typescript
import { InkCloud, type InkHandle } from "./InkCloud";
import { isTap } from "@/lib/outro/ink";
```

- [ ] **Step 2: Add the refs**

Inside `ReefScene`, after `const containerRef = useRef<HTMLDivElement>(null);`, add:
```typescript
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const inkRef = useRef<InkHandle | null>(null);
```

- [ ] **Step 3: Add the document-level touch listeners (tap-vs-scroll guarded)**

After the existing resize `useEffect` (the one that sets `vw`), add a new effect. It must
read `creaturesOn` — so place this effect AFTER the line
`const creaturesOn = atLeast(tier, "low") && active;` is computed. To keep hook order
valid, move the touch effect to just before the `return (`:
```typescript
  // Mobile/touch: tapping near the octopus scares it; tapping on it inks it.
  // Document-level passive listeners (the scene's children are pointer-events-none),
  // tap-vs-scroll guarded so scrolling onto the page-bottom scene never triggers it.
  useEffect(() => {
    if (!creaturesOn) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(any-pointer: coarse)").matches) return;
    const el = containerRef.current;
    if (!el) return;
    let sx = 0, sy = 0, st = 0;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      sx = t.clientX; sy = t.clientY; st = performance.now();
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      if (!isTap(performance.now() - st, Math.hypot(t.clientX - sx, t.clientY - sy))) return;
      const rect = el.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      tapRef.current = { x, y, t: performance.now() };
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [creaturesOn]);
```

- [ ] **Step 4: Render InkCloud + pass props to Octopus**

Replace the final octopus line:
```tsx
      {creaturesOn && <Octopus pointer={pointer} />}
```
with:
```tsx
      {creaturesOn && <InkCloud ref={inkRef} />}
      {creaturesOn && <Octopus pointer={pointer} tapRef={tapRef} inkRef={inkRef} />}
```

- [ ] **Step 5: Full gate**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
npx tsc --noEmit && npm test 2>&1 | grep -E 'Test Files|Tests ' && npm run build 2>&1 | tail -3
```
Expected: `tsc` clean; all vitest pass (incl. the new `ink.test.ts`); build OK with the
outro route present.

- [ ] **Step 6: DOM-verify the ink render path (rAF-independent)**

The octopus trigger runs in rAF (paused in the hidden tab), but `InkCloud.emit` is a
React state update, so its render is verifiable. Start the server, then in the browser
console confirm a puff node mounts at `z-7` when emit is called via a temporarily exposed
handle — OR accept tsc/build + code review here and have the user confirm the live feel
on desktop (crowd the octopus → ink) and a real phone (tap → scare, tap-on → ink). State
clearly which was done.

- [ ] **Step 7: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/components/outro/ReefScene.tsx
git commit -m "feat(outro): wire mobile tap scare + ink into the reef scene

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (whole feature)

- [ ] `cd web && npx tsc --noEmit` — clean.
- [ ] `cd web && npm test` — all pass incl. `ink.test.ts`.
- [ ] `cd web && npm run build` — clean.
- [ ] Desktop (real cursor): crowd the octopus until it panics → ink blob appears behind
  it (`z-7`, under `z-8`), it bolts, ink fades, no second ink during the ~7s hide.
- [ ] Desktop: hunt the octopus toward the top → it gets pushed off-screen (top) instead
  of sticking at the header gap, then drifts back down.
- [ ] Mobile (real device): scroll onto the scene → octopus undisturbed (tap-vs-scroll
  guard); tap near it → it darts away; tap on it ~2× → ink + bolt; crab walks on the
  lowered floor and the wave sits below it.

## Notes / tuning

- Visual px (`bottom-[24px]`, wave `translate-y-[14px]`, ink sizes/colour, radii
  `INK_HIT_R`/`SCARE_TAP_R`, `ANNOY_*`) are starting values — tune to taste; all live in
  `ink.ts`, `Crab.tsx`, `ReefScene.tsx`, `InkCloud.tsx`.
- Reduced-motion / `off` tier already disables the whole scene (creatures gated), so no
  extra handling is needed.
