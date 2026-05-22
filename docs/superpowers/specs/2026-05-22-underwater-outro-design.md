# "The Deep" — Underwater Outro — Design Spec

**Date:** 2026-05-22
**Owner:** Noel Studer
**Status:** Draft for review

## 1. Goal

Transform the page's final section (the current `Footer` outro) into an **interactive underwater scene** — "overshooting" the portfolio with a memorable, alive closer. The seabed is populated with life (drifting fish, swaying kelp, coral), ambient procedural bubbles, and cursor-driven water feedback (bubble trail, repel, ripple). The whole thing is wrapped in a **game-style graphics setting** so it scales across devices and doubles as an A/B validation switch against the existing outro.

This is **one section**, shipped as a **selectable variant** — the current outro is never deleted.

## 2. Scope

**In scope:** a new "The Deep" outro scene; a hybrid DOM + `<canvas>` rendering layer; procedurally generated bubbles, kelp, and pixel-art sand; GIF/PNG sea creatures (octopus, mosasaurus, coral) wired with placeholders; a custom desktop cursor (bubble trail + repel/ripple + one creature following); a settings "Outro scene" section with a scene picker and a graphics-quality tier; viewport + tab-visibility gating; reduced-motion and mobile fallbacks; store + i18n additions.

**Out of scope (now):** changing any other section of the page; replacing the global bubbles backdrop used in hero→skills; sourcing/finalizing the creature art (placeholders until the user supplies it); a footer credit line for the artists (explicitly deferred — see §15); making "The Deep" the default scene (stays opt-in via settings for now).

## 3. Concept — "The Deep"

The page **sinks** at the end. The existing section already reads as a seabed (dark water, rising bubbles, sandy floor), so we keep that DNA and add life + interactivity. It stays the page's one deliberate **pop of color**, consistent with the existing "outro = playful" precedent (`ByeSand`).

Key creative decisions (all confirmed with the user):

- **Keep `intro-bg.svg` as the deepest parallax layer**, recolored to a deeper under-the-surface blue and dimmed/slowed — new life layers sit *on top* of it for a depth effect. Nothing is thrown away.
- **No wave divider** into the section — it fades down into deep water via a dark gradient (replaces `WaveDivider` at the footer top).
- **"Thanks for stopping by." stays the focal point**, big and up top; the scene lives behind/around it; functional footer chrome (©, GitHub, back-to-top) sits in a legible bar at the bottom.
- **Pixel-art aesthetic** for the generated elements (sand, kelp) and the supplied creature sprites.

## 4. Architecture — hybrid DOM + canvas

The cursor-driven ripple/repel water physics needs a **`<canvas>`** to stay smooth; the pixel-art kelp/sand and the GIF creatures want to be **DOM**. They are layered. (Pure-DOM was rejected: ripple/repel on many DOM nodes thrashes layout. Pure-canvas was rejected: it loses the "built in HTML" pixel grids and complicates GIF compositing.)

**Z-stack, back → front:**

1. **Deep-water gradient background** (theme-aware) + the recolored `intro-bg.svg` as the dim, slow, far parallax layer.
2. **`<canvas>`** — procedural bubbles + cursor ripple + repel physics. `pointer-events: none`. Single render loop.
3. **Creature layer (DOM)** — GIF fish on motion paths; the one creature (octopus) that tails the cursor.
4. **Flora layer (DOM)** — kelp pixel-grids + coral, planted on the floor, CSS sway.
5. **Pixel-art sand floor (DOM/canvas-painted).**
6. **Content layer (top)** — heading + note + footer chrome (GitHub, ©, back-to-top).
7. **Custom cursor overlay** — desktop only.

Layers 2–4 only animate when the section is **in viewport AND the tab is visible** (IntersectionObserver + Page Visibility API), so it never burns battery off-screen.

## 5. Settings hub — scene picker + graphics tier

A new **"Outro scene"** section added to the existing settings (`SettingsPanel.tsx`, Appearance tab — a new `PanelHead` block; a nested route can come later if it grows). It exposes:

- **Scene picker:** `Current outro` ⇄ `The Deep`. Default = **Current outro** (The Deep is opt-in for now). This is the user's live A/B validation tool; the classic outro is preserved permanently.
- **Graphics quality:** game-style tier selector (see §6). The performance escape hatch — if a device struggles, dial it down.

Both values live in the Zustand store (§8), persisted.

## 6. Graphics tiers

The Core-vs-escalation split is encoded as quality tiers. "Off" doubles as the reduced-motion fallback; "Low" is the mobile default; "Medium" is the desktop default.

| Tier | What runs |
|------|-----------|
| **Off** (= reduced-motion) | Static composed scene: recolored SVG bg, kelp/coral frozen, plain heading. No canvas, no cursor effects. |
| **Low** (mobile default) | + rising procedural bubbles (canvas), kelp sway. No cursor effects. Reduced particle/creature counts. |
| **Medium** (desktop default) | + custom cursor: **bubble-trail + water repel**; **octopus follows the cursor** and darts off on fast moves. |
| **High** (the flex) | + ripple distortion; 🦕 **mosasaurus slow cruise**; **"NS" pixel motif** (MotionGrid or CSS-grid fallback); higher particle counts; other fish flee the cursor. |

Effective tier = `min(user-selected tier, device cap)` then forced to **Off** if `prefers-reduced-motion: reduce`. Touch devices (`any-pointer: coarse`, no `fine`) never mount cursor effects and cap at **Low** by default.

## 7. Components & file structure

New folder `web/src/components/outro/`. The current `Footer.tsx` is refactored so its **content** (heading, note, footer bar) is shared chrome and the **backdrop** is swappable.

```
web/src/components/outro/
├── OutroSection.tsx      # top-level; reads outroScene; renders shared chrome + chosen backdrop
├── ClassicBackdrop.tsx   # extracted from today's Footer: intro-bg.svg + dark wash + WaveDivider + ByeSand
├── DeepScene.tsx         # orchestrates the underwater layers; reads graphicsTier; gates on useSceneActive
├── WaterCanvas.tsx       # <canvas>: procedural bubbles + cursor ripple/repel physics (single rAF)
├── KelpBed.tsx / Kelp.tsx# procedural pixel-grid kelp strands, multi-segment CSS sway from the base
├── SandFloor.tsx         # procedurally generated pixel-art sand
├── Coral.tsx             # coral PNG (placeholder asset) + gentle CSS sway
├── SwimmingCreature.tsx  # a GIF sprite on a motion path; one variant follows the cursor
├── PixelSignoff.tsx      # "NS" motif — MotionGrid (copy-in) OR plain CSS-grid + keyframes
└── CursorLayer.tsx       # animate-ui Cursor (copy-in): bubble-trail + CursorFollow; desktop only
```

Hooks in `web/src/hooks/`:

- `useSceneActive.ts` — IntersectionObserver + Page Visibility → `active: boolean` that pauses/resumes the loop.
- `useGraphicsTier.ts` — derives the effective tier from store + device caps + `prefers-reduced-motion`.
- `usePointerField.ts` — shared normalized cursor position + velocity, consumed by the canvas (repel/ripple) and the following creature.

Pure, unit-testable helpers in `web/src/physics/` (or `web/src/lib/`), seeded with `mulberry32` to match the existing flask generators:

- `generateBubbles(seed, count, bounds)` → bubble particle descriptors.
- `generateKelp(seed, params)` → strand + per-segment sway phase descriptors.
- `generateSand(seed, cols, rows)` → pixel color grid.
- creature path math (e.g. `creaturePath(t, …)`).

`Footer` import in `web/src/app/[lang]/layout.tsx:74` is swapped to `OutroSection` (same `{ dict, lang }` props).

## 8. State / store changes

Add to `useAppStore` (`web/src/store/useAppStore.ts`), both persisted via `partialize`:

```ts
outroScene: "classic" | "deep";          // default "classic"
setOutroScene: (s) => void;
graphicsTier: "off" | "low" | "medium" | "high"; // default "medium" (capped per device at runtime)
setGraphicsTier: (t) => void;
```

## 9. Data flow

Settings UI → Zustand (persisted) → `OutroSection` reads `outroScene` and renders `ClassicBackdrop` or `DeepScene` → `DeepScene` reads effective tier (`useGraphicsTier`) to enable/disable layers and set particle/creature counts → `WaterCanvas` runs its rAF only while `useSceneActive` is true → `usePointerField` feeds cursor position to the canvas physics and the following creature.

## 10. Assets

- **Generated in code (no asset needed):** pixel-art sand floor, swaying kelp, all bubbles, the recolored water, the "NS" motif.
- **Supplied by the user (placeholders wired until provided):** octopus GIF (cursor-follower / drifter), mosasaurus GIF (rare cruise), coral PNG (static, planted). The two GIFs **must have transparent backgrounds** or they render as opaque boxes. Assets live in `web/public/underwater/`.

Until real assets land, obvious placeholder sprites are used so the scene and the pipeline are fully testable.

## 11. Performance & gating

- One `<canvas>`, one rAF; GPU-friendly; particle counts capped per tier (illustrative: bubbles ≈ 20 / 40 / 70 for low/med/high; creatures ≈ 1 / 2 / 4).
- Loop runs only when **in viewport AND tab visible**; fully stops otherwise; resumes on return.
- `devicePixelRatio`-aware canvas sizing, capped (e.g. ≤ 2) to bound fill cost.
- The graphics tier is the user/device escape hatch.
- Full cleanup on unmount: cancel rAF, remove pointer/visibility listeners, disconnect observers.

## 12. Accessibility, reduced-motion, mobile

- `prefers-reduced-motion: reduce` → effective tier forced to **Off** (static, composed, legible scene + plain heading).
- Touch / no fine pointer → cursor layer never mounts; tier capped at **Low**.
- Heading + footer chrome keep current semantics (`<footer>`, real links/buttons), light text + `textShadow` for legibility over the water in both themes.
- Decorative layers are `aria-hidden`; canvas is non-interactive (`pointer-events: none`).

## 13. Dependencies

- **animate-ui `Cursor`** and **`MotionGrid`** are **copy-in source** (shadcn-registry style), not tracked npm packages — once generated into `web/src/components/`, they are frozen local files (no upstream version churn). Both build on **`motion`**, already in the project.
- `MotionGrid` is used only for the optional High-tier "NS" motif and is replaceable by a plain CSS-grid + keyframes implementation (`PixelSignoff.tsx` abstracts this).
- No new runtime npm dependency is expected.

## 14. Testing & verification

- **Unit (vitest):** the pure generators (`generateBubbles`, `generateKelp`, `generateSand`, path math) are deterministic via seeded `mulberry32` — assert shape, counts, bounds, and determinism, matching the existing `generateFlasks.test.ts` pattern.
- **Typecheck:** `tsc` must pass.
- **Do NOT gate on `next build`** — it fails on pre-existing react-compiler eslint errors unrelated to this work. Gate on `tsc` + `vitest`.
- **Visual/interaction:** verified manually by the user — the in-session Chrome tab is hidden, so rAF/IO/canvas motion cannot be visually verified in-session (only DOM/data). Checklist: scene picker swaps backdrops; tiers gate features correctly; reduced-motion → Off; touch → no cursor + Low cap; loop pauses off-screen / on tab hide; cleanup leaves no leaked rAF/listeners; both themes legible.

## 15. Deferred / open items

- **Creature art** — user to supply transparent-bg octopus + mosasaurus GIFs and the coral PNG; placeholders until then.
- **Footer artist credit line** — skipped for now (may revisit when art is finalized).
- **Default scene** — stays `classic`; flipping `deep` to default is a later one-line change once validated.
- **Settings nesting** — starts as a section in the Appearance tab; promote to a nested route if it grows.
