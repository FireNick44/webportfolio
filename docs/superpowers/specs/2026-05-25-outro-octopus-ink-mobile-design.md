# Outro Octopus — Mobile Scare, Ink Release & Crab/Wave Fix — Design

**Date:** 2026-05-25
**Branch:** `feature/underwater-outro` (shared; concurrent agents active)
**Status:** Draft for review

## Goal

Three improvements to the underwater outro scene (`web/src/components/outro/`):

1. **Crab/wave mobile fix** — on mobile the crabs walk too high above the (already
   lowered) sand; drop the wave and the crab path so they sit on the floor together.
2. **Mobile scare** — mobile has no cursor, so the octopus only wanders. Add touch:
   tapping near him makes him dart away scared (reusing the existing avoid/flee AI).
3. **Ink release** — when the octopus is harassed past a threshold he emits an ink
   puff (a CSS blob, behind him, from his mass-centre) and bolts. Desktop fills the
   harassment meter by cursor-crowding; mobile fills it by taps (tap *around* = small
   scare, tap *on* him = fast path to ink).

Performance is a priority (mobile runs the `low` tier = no canvas), so ink is pure CSS.

## Unified model

One **annoyance meter** on the octopus — it extends the existing `scare` accumulator.
Ink fires when the meter crosses a high threshold; *what fills it* differs by device:

| Device | Fills the meter | Around → | On → |
|---|---|---|---|
| Desktop (tier `high`, cursor) | cursor crowding (existing `scare`) | flees (existing avoid) | n/a (not clickable; crowding → panic ink) |
| Mobile/touch (tier `low`, taps) | valid taps near him | small bump → flee (scared) | big bump → fast ink |

On both, crossing the ink threshold = **emit ink puff + enter the existing `hide`
(panic-bolt) state**. A cooldown (the hide duration) prevents ink spam.

## Decisions (locked with user)

- Ink visual = **CSS gradient blob** (no canvas, mobile-safe).
- Desktop ink trigger = **harassment → panic** (reuse `scare`, no new click handling).
- Mobile: tap **around** = scared; tap **on** = ink (can accumulate to ink).
- Same ink puff + bolt + cooldown on both.

## Critical input-handling requirements

These are behavioral requirements, not implementation niceties:

1. **Tap vs scroll.** The outro is the **bottom of the page** — every visitor scrolls
   onto it, and `touchstart` fires during scroll. A tap is only counted when:
   `touchend` occurs within **250 ms** of `touchstart` **and** the touch moved
   **< 10 px**. Anything longer or with movement (i.e. a scroll/drag) is ignored.
   Without this, the octopus would scare on first view — a bug, not an easter egg.
2. **Pointer-events.** The scene container is `aria-hidden` and its creatures are
   `pointer-events-none`, so an `onTouchStart` on the scene won't fire reliably.
   Use **document-level passive listeners** (`touchstart`/`touchend`, `{passive:true}`,
   never `preventDefault` → scrolling unaffected) that hit-test the tap against the
   scene container's `getBoundingClientRect()`. Only attach them on touch-capable
   devices (`matchMedia("(any-pointer: coarse)").matches`) and when creatures are on.

## Architecture

```
ReefScene
 ├─ tapRef:  RefObject<{ x:number; y:number; t:number } | null>   // latest valid tap (scene coords)
 ├─ inkRef:  RefObject<InkHandle>                                  // InkCloud imperative handle
 ├─ document touch listeners (touch devices only) → write tapRef on a valid tap
 ├─ <InkCloud ref={inkRef} />            // z-[7], renders + lifecycles ink puffs
 └─ <Octopus pointer={pointer} tapRef={tapRef} inkRef={inkRef} />  // owns the meter + emits ink
```

The octopus owns its meter and self-classifies taps (it knows its own `st.x/st.y`), so
no position needs to be lifted out. Ink rendering is a **separate sibling** component
because it must sit *behind* the octopus (`z-[7]` < octopus `z-[8]`); it can't be a
child of the octopus div.

### Components

**`InkCloud.tsx` (new)** — `forwardRef`, exposes `InkHandle = { emit(x:number, y:number): void }`.
- Holds a small array of active puffs `{ id, x, y, born }`; `emit` pushes one and sets a
  timeout to remove it after the animation (~1.4 s).
- Each puff renders **1–3 stacked** `<div>`s, absolutely positioned at `(x,y)`, each a
  dark `radial-gradient(circle, rgba(8,12,16,0.7) → transparent)`, with a **static**
  `filter: blur(...)` (do NOT animate blur — animate only transform/opacity for perf).
- CSS keyframe (`ink-bloom` in globals.css): `scale(0.2)→scale(1.6)`, `opacity 0.75→0`,
  slight upward `translateY(-18px)` drift, ~1.4 s `ease-out`. Wrapper at `z-[7]`,
  `pointer-events-none`.

**`Octopus.tsx` (modified)** — new props `tapRef`, `inkRef`. New state fields: `annoy`
(meter), `inkCooldownUntil`, `lastTapT`.
- **Each frame**, after the existing cursor logic:
  - **Read taps (touch):** if `tapRef.current` has `t > st.lastTapT`, consume it.
    Compute `d = hypot(tapX - st.x, tapY - st.y)`.
    - `d <= INK_HIT_R` → `st.annoy += ANNOY_ON` (big) and treat as a threatening poke:
      set a transient avoid impulse away from the tap + bump `scare`.
    - else `d <= SCARE_TAP_R` → `st.annoy += ANNOY_AROUND` (small) + avoid impulse away
      from the tap (so he visibly darts off) + bump `scare`.
    - else ignore (tap not near him).
    Set `st.lastTapT = tapRef.t`.
  - **Desktop harassment:** the existing `scare` already accumulates from cursor
    proximity. Mirror it into the same ink decision: when `scare >= SCARE_TRIGGER`
    (the existing panic threshold) **or** `st.annoy >= ANNOY_INK`, and
    `now >= st.inkCooldownUntil`, then: `inkRef.current?.emit(st.x, st.y + INK_DROP)`,
    set `st.inkCooldownUntil = now + HIDE_MIN`, reset `st.annoy = 0`, and enter the
    existing `hide` (bolt) branch.
  - `st.annoy` decays toward 0 (`ANNOY_DECAY * dt`) when not poked, so isolated taps
    don't permanently bank toward ink.

### Constants (pinned; tune live)

```
INK_HIT_R   = 70    // tap within this of mass-centre = "on him" → fast ink
SCARE_TAP_R = 180   // tap within this (but outside INK_HIT_R) = "around" → scared
ANNOY_ON    = 0.5   // meter add per on-him tap   (≈2 taps → ink)
ANNOY_AROUND= 0.18  // meter add per around tap
ANNOY_INK   = 1.0   // meter threshold to emit ink (mobile path)
ANNOY_DECAY = 0.35  // per second
INK_DROP    = 30    // px below mass-centre = ink origin (his underside)
// cooldown = HIDE_MIN (7000) — reuses the hide window; no second ink while hiding.
TAP_MAX_MS  = 250   // tap vs scroll: max touch duration
TAP_MAX_MOVE= 10    // px: max movement to still count as a tap
```

## Part 1 — crab/wave mobile positioning

Mobile (`vw < 640`) only; desktop unchanged.
- **Crab** (`Crab.tsx`): both the solo `<img>` and the family `<img>`s are pinned at
  `bottom-[44px]`. Lower them on mobile so they sit on the dropped sand. Approach:
  pass the scene width down (or read `window.innerWidth` once like ReefScene does) and
  use `bottom-[24px]` on mobile / `bottom-[44px]` desktop. Start at **24px**, tune live.
- **Wave** (`ByeSand` in `ReefScene.tsx`, line ~79): shift down on mobile to keep the
  crest below the crab line. Add `translate-y-[14px] sm:translate-y-0` (start ~14px,
  tune live). `ByeSand` already sits `bottom-0`; the existing `SandFloor`
  `translate-y-[20px]` mobile drop stays.
- Exact px are tuned by eye on the running app (browser-checkable via screenshot even in
  the hidden tab — static layout, not rAF).

## Z-order (after change)

`waves z-2 → bg kelp z-4 → sand z-5 → corals/crab z-5/6 → ink z-7 → octopus z-8 → front kelp z-9`.
Front kelp still overlays the octopus; ink sits just behind him as requested.

## Files

- **New:** `web/src/components/outro/InkCloud.tsx`
- **Modify:** `web/src/components/outro/Octopus.tsx` (props, meter, tap handling, ink emit)
- **Modify:** `web/src/components/outro/ReefScene.tsx` (tapRef, inkRef, document touch
  listeners, render InkCloud + wire props, wave mobile shift)
- **Modify:** `web/src/components/outro/Crab.tsx` (mobile bottom offset)
- **Modify:** `web/src/app/globals.css` (`@keyframes ink-bloom`)

## Testing / verification

- **Unit (vitest):** extract the pure bits and test them —
  - `isTap(durationMs, movePx)` → tap vs scroll boundary (250/10).
  - `classifyTap(dist)` → `"on" | "around" | "miss"` at INK_HIT_R / SCARE_TAP_R.
  - meter: `ANNOY_ON` reaches `ANNOY_INK` in ≤2 on-taps; decay reduces over time.
- **Gates:** `tsc` + `vitest` green; `next build` clean.
- **Desktop (browser):** crowd the octopus with the cursor → he panics, an ink blob
  appears behind him (z under him), he bolts; ink fades; no second ink during hide.
- **Mobile path (hidden-tab constraint):** rAF/visual motion isn't verifiable in the
  in-session hidden tab, so verify the *logic* via the extracted pure functions + DOM:
  dispatch synthetic `touchstart/touchend` and assert an ink node mounts at `z-7`.
  Real-device feel is tuned by the user.
- **Scroll safety:** a `touchstart`→`touchend` with >10px move or >250ms must NOT
  register (asserted in `isTap` unit test) — protects the scroll-onto-scene case.

## Out of scope

- Reduced-motion already gates the whole scene off via tier; no extra handling.
- No ink on desktop direct-click (he isn't clickable; harassment covers it).
- No new art assets (ink is CSS).
