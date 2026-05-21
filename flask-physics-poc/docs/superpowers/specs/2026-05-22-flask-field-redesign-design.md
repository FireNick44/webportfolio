# Flask Field Redesign — Design Spec

**Date:** 2026-05-22
**Status:** Approved (design), pending implementation plan
**Scope:** Single combined spec covering the data model, responsive layout, performance, and mouse interaction for the flask physics field.

## Problem

The current flask field has three coupled weaknesses:

1. **Fixed count, variable canvas.** `FLASK_COUNT = 40` / `MOBILE_FLASK_COUNT = 18` are hardcoded. Wide screens look sparse ("too few"); narrow screens cram.
2. **Percentage positions, pixel sizes.** Each flask's `xPct` is a fraction of viewport width, but `FLASK_WIDTH` is a fixed `120px`. As the viewport grows, gaps grow but flasks don't — so *density* (flasks per unit area, which is what the eye reads) drifts uncontrollably. Percentages control position, not density. True responsiveness means holding density roughly constant.
3. **Per-flask render loops.** Every non-static flask runs its own `requestAnimationFrame` loop (`FlaskChain.tsx`), so ~26 independent RAF callbacks plus ~270 physics bodies. Naively raising the count multiplies both — directly at odds with "make it performant."

Plus two interaction problems: the mouse interaction feels rough (hit area too large, no contact friction), and a known past failure where contact friction kept the physics simulation from ever settling ("the whole screen never ended calculating physics").

## Goals

- **Constant density** across all viewport sizes (count derived from screen area, pixel-based spacing).
- **Data-driven** flask content from an editable JSON, seeded per session.
- **Performant**: one render loop; idle page costs zero physics CPU; physics body count bounded independent of visual density.
- **Better mouse feel**: smaller hit area, contact friction, and a left↔right "shake" when a flask is hit — without ever defeating sleep.

## Non-goals

- No new build tooling, no framework changes (stays React + TS + Vite + Matter.js, single-file build).
- No redesign of the flask SVG art itself (`FlaskSVG.tsx` liquid/glass/icon rendering is unchanged except where it consumes new `color`).
- Not a general physics engine refactor beyond what these goals require.

## Decisions (locked with user)

| Topic | Decision |
| --- | --- |
| Density behavior | Constant density — count from screen area |
| Overflow (count > 22 skills) | Fill extra slots with **plain glass flasks** (no icon); each skill icon appears once |
| Randomness | **Per-session seed** stored in `sessionStorage`; stable while tab is open, fresh next visit |
| JSON fields | Add `color` (optional) and `priority` per skill |
| Priority meaning | Drives **both** depth (front/back) and hang height (higher priority → front + higher) |
| Column model | **Front-to-back depth bands**; back bands are skeletons (no physics, no interaction) |
| Column count | Configurable, **default 3** bands with **1 skeleton** (back); bump to 5 / 2 skeleton anytime |
| Mouse — mobile | **Drag only** (touch has no hover) |
| Mouse — desktop | **Bump-on-contact + click-drag** (cursor collision body triggers the shake) |
| Friction | **Contact friction** on flasks + walls (grip, not slide), made safe by the quiescence guard |

## Architecture

### 1. Data model

Enrich the existing `src/data/skills.json` (keep it as the single content source). Each entry:

```jsonc
{
  "id": "python",
  "name": "Python",
  "svgPath": "/skills/python.svg", // existing key, unchanged
  "color": "rgba(86,200,255,0.7)", // NEW, optional — falls back to the FLASK_COLORS palette by seeded pick
  "priority": 9                    // NEW, integer; higher = more prominent (front band + higher hang)
}
```

- `color` and `priority` are **optional with defaults** so existing entries keep working: missing `priority` defaults to a mid value; missing `color` falls back to a seeded palette pick.
- Structural/tuning knobs are **not** in the JSON (they are not daily-edited content). They live in `src/physics/constants.ts` as named constants:
  - `COLUMN_COUNT` (default 3), `SKELETON_BANDS` (default 1)
  - `FLASK_SPACING_X` (the single density knob — target/min horizontal spacing in px between flasks in a band; replaces `MIN_SAME_LAYER_DISTANCE_PCT`)
  - `MIN_FLASKS`, `MAX_FLASKS` (clamp)
  - `MAX_PHYSICS_FLASKS` (body budget)
  - Mouse: `MOUSE_BODY_RADIUS` (lower from 15 → ~7), shake impulse magnitude, per-flask shake cooldown ms

### 2. Layout engine (constant density + depth bands)

Computed on mount and on resize, from `{ width, height }`:

1. **Target count (width-driven).** Chains anchor along the *top* of the screen, so the number of anchors scales with **width**, not area — a taller window gives flasks more room to swing, not more anchors. Per band: `flasksPerBand = max(1, floor(width / FLASK_SPACING_X))`; `targetCount = clamp(COLUMN_COUNT * flasksPerBand, MIN_FLASKS, MAX_FLASKS)`. Vertical coverage of a tall screen comes from *varied chain length* (priority → hang height), not from more anchors. `FLASK_SPACING_X` is the single density knob, tuned visually once.
2. **Band assignment by priority:** sort skills by `priority` desc. Distribute across `COLUMN_COUNT` bands front→back so the highest-priority skills occupy front (interactive) bands. The back `SKELETON_BANDS` bands are static.
3. **Overflow:** if `targetCount > skills.length`, the surplus become **plain glass flasks** (no icon, seeded color), placed in the back/skeleton bands as decoration.
4. **Physics budget:** at most `MAX_PHYSICS_FLASKS` flasks are dynamic (front bands). Any beyond the budget render as skeletons regardless of band. Visual density can exceed physics cost.
5. **Horizontal placement:** seeded scatter within each band using a **pixel** minimum spacing (`FLASK_SPACING_X`) and rejection sampling — consistent gaps at any width. (Replaces the percentage-based spacing.)
6. **Vertical placement:** priority maps to hang height — higher priority → higher anchor / shorter chain. Lower priority hangs lower.
7. **Seed:** read a numeric seed from `sessionStorage` (generate + persist on first load); feed `mulberry32(seed)`. Deterministic within a session, fresh on the next visit. Layout recomputation on resize reuses the same seed so it stays stable.

**Mobile** (`width < MOBILE_BREAKPOINT`) keeps the existing **row-based layout** — anchors distributed *down* the height in rows, not all at the top — because a narrow/tall phone needs vertical distribution to avoid an empty lower half. It reuses the same data pipeline (JSON content, `priority`, per-session seed, plain-flask overflow), but lays out as `rows × per-row` where `per-row ∝ width` and `rows ∝ height`. Skeleton bands are optional on mobile (default: none). This is a deliberate yes/no: mobile is **not** the desktop depth-band model with fewer flasks.

### 3. Performance

- **Single central sync loop.** Remove the per-`FlaskChain` RAF loops. One loop (extending or alongside `useAnimationSync`) iterates active flask bodies and writes their DOM transforms. Skeletons are positioned once and never touched again.
- **Quiescence guard (the cure for "never-ending physics").** Track whether any dynamic body is awake. When all sleep, **stop calling `Engine.update`** and stop the sync loop. Idle page = 0 physics/render CPU. **Wake events:** drag start, scroll nudge, resize — and, critically, **any `mousemove` inside the container resumes the engine** for a short window. (The cursor collision body only detects contacts while the engine is live, so a suspended engine has no "bump" to wake on — `mousemove` is the wake trigger; the bump/shake then fires once the loop is running.) The field re-sleeps once everything settles.
- **Body budget.** `MAX_PHYSICS_FLASKS` bounds dynamic bodies; the rest are skeletons. Density scales without physics cost scaling.
- **Sleep reachability.** Tune `sleepThreshold` and damping so that flasks with contact friction *can* reach sleep (the past bug was bodies hovering just above threshold forever). The quiescence guard is the safety net; reachable sleep is the first line of defense.

### 4. Mouse interaction

- **Desktop:** a small cursor body (radius ~7, down from the dormant `MOUSE_BODY_RADIUS = 15`) follows the pointer (wires up the existing-but-unused `CAT_MOUSE` / `MOUSE_MASK` scaffolding). It is a **sensor** (`isSensor: true`): it does *not* physically push flasks — a solid body would re-apply contact every step, defeating the cooldown and sleep. Instead we listen for its `collisionStart` events and apply a **one-shot horizontal impulse** ("nuke") that knocks the flask into an L↔R shake; the chain + damping resolve it back to rest. Click-and-drag is retained alongside.
- **Mobile:** drag only. No cursor body (no hover on touch).
- **Per-flask shake cooldown.** A flask that was just hit ignores re-triggers for `SHAKE_COOLDOWN_MS`. Without this, sweeping the cursor through a flask re-applies the impulse every frame, keeping it permanently awake — defeating sleep and re-creating the runaway-CPU bug.
- **Contact friction.** Add surface `friction` to flask bodies and walls so flasks grip rather than slide endlessly. Safe because: reachable sleep threshold + the quiescence guard.
- **Smaller hit area for drag.** Grab detection (`Matter.Query.point`) is unchanged in mechanism but benefits from the smaller cursor body for the bump path; drag still selects the flask under the pointer.

## Edge cases & risks

- **Runaway physics (primary risk).** Mitigated by: (a) reachable sleep threshold + damping, (b) per-flask shake cooldown, (c) the quiescence guard that halts the engine when everything sleeps. All three, layered.
- **Seed missing / `sessionStorage` unavailable** (privacy mode): fall back to a fixed default seed; layout still deterministic, just not per-session.
- **`targetCount` huge on ultrawide:** clamped by `MAX_FLASKS`; physics further bounded by `MAX_PHYSICS_FLASKS`.
- **Resize thrash:** layout recompute is cheap (positions only) and reuses the session seed; debounce via the existing `ResizeObserver` if needed.
- **Skills with no `priority`:** default to mid priority; ties broken by seeded order.
- **Fewer slots than skills** (narrow screens, `targetCount < skills.length`): only the highest-`priority` skills appear; the lowest-priority ones are **omitted entirely**, not just demoted. Intended — priority decides who makes the cut.

## Verification

- This is a visual POC; primary verification is running the app and watching behavior, aided by the existing `DebugPanel` (body count, sleep state).
- Add an **idle/active physics indicator** (debug-only) to *prove* the engine suspends when the field settles — directly demonstrates the "never-ending physics" fix.
- **Mobile path caveat:** the in-session browser cannot shrink the viewport below desktop widths, so the mobile drag-only branch is verified by code/logic review and flagged for the user to confirm on a real device.

## Tuning constants (set by feel, post-implementation)

`FLASK_SPACING_X`, `MOUSE_BODY_RADIUS`, shake impulse magnitude, `SHAKE_COOLDOWN_MS`, `friction`, `MAX_PHYSICS_FLASKS` — adjusted visually after the system works; the design fixes the *structure*, not the final numeric feel.

**`sleepThreshold` and damping are load-bearing, not cosmetic.** They are the first line of defense for sleep-reachability (the quiescence guard is only the safety net). They must get explicit attention in the implementation plan and verification — not be left to "feel" — because they are what prevents the runaway-CPU bug from recurring.
