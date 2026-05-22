# Generic Depth-Driven Flask Field — Design Spec

**Date:** 2026-05-22
**Owner:** Noel Studer
**Status:** Draft for review

## 1. Goal

Make the flask rack a **single, generic, depth-driven model** where one `scale`
per flask is the source of truth for size — driving the physics body, the chain,
and the visual *together* — and where overall load adapts to the device via a
**graphics-quality setting**.

This replaces today's setup where `DEPTH_SCALE` scales only the visual while the
physics bodies stay a fixed size, so the physics hitbox drifts away from the
glass (visible with the debug overlay) and a `scaleOffsetY` fudge papers over it.

## 2. Problem / current state

- `DEPTH_SCALE = [1.0, 0.8, 0.6]` is applied **only** as a CSS transform on the
  visual (`FlaskChain.tsx`). The physics flask trapezoid (`createFlaskBody`,
  fixed `75×145`) and chain segments (`createChainBodies`, fixed) never shrink.
- Result: for any non-front flask the green debug hitbox is **bigger than and
  offset from** the visible glass; `scaleOffsetY = (FLASK_HEIGHT/2)(1-scale)`
  exists purely to fake vertical alignment.
- Depth (front/back) is a **discrete 3-layer** concept assigned by chain length;
  layer 2 is hard-coded static (`isStatic = layer === 2`) with no icon.
- Desktop and mobile layout live in one `generateFlasks` function but as two
  fully separate branches.
- Each non-static flask runs **its own `requestAnimationFrame`** DOM-sync loop
  (~20 loops); the engine runs a separate RAF. (The variable-delta warning and
  jitter in that engine loop were already fixed separately — fixed timestep.)

## 3. Scope

**In scope:**
- Unified per-flask `scale` driving physics + chain + visual; delete
  `scaleOffsetY`.
- `isSkeleton` flag decoupled from `skillIcon` (empty-but-interactive flasks
  become possible; skeletons are static, no physics, no icon).
- A single `FieldConfig` object that all field generation reads from.
- Pure, unit-tested `generateFlasks(config)` (POC-style).
- Desktop 5-tier layout (3 physics + 2 skeleton) / mobile column + 2-plane
  background skeletons.
- Graphics-quality tiers (`low | medium | high`) + `auto` device detection
  (heuristics + runtime FPS probe), persisted in the store, controllable in
  `SettingsPanel`.
- Consolidate the ~20 per-flask RAF loops into the single frame loop (perf;
  matters most at `high`).

**Out of scope (now):**
- Changing the flask art / SVG itself, liquid behaviour, the icon water-split
  effect, mouse interaction model, walls, or the already-fixed timestep loop's
  core math.
- Per-flask continuous depth (rejected: needs desktop width; mobile is a column).
- True GPU-model detection (browsers don't expose it reliably — see §8).

## 4. Core model

Every flask is described by one shape, produced by layout and consumed by both
physics and rendering:

```ts
interface FlaskConfig {
  xPct: number;          // horizontal anchor as fraction of width
  anchorY: number;       // world-space anchor Y for the chain top
  segments: number;      // chain segment count
  color: string;         // liquid color
  scale: number;         // SINGLE source of truth for size (0..~1.1)
  isSkeleton: boolean;   // true => static, no physics, no rAF, no icon
  skillIcon?: string;    // optional; independent of isSkeleton
}
```

Two **independent** flags:
- `isSkeleton` → physics vs static. (Replaces `isStatic = layer === 2`.)
- `skillIcon?` → has an icon vs empty. An interactive flask may have no icon
  ("empty-physics"); this happens whenever physics-flask count exceeds the
  number of skills (22).

## 5. `FieldConfig` — the seam

All knobs that decide *how many / how big / how deep* live in one object so the
quality layer (§8) is a pure swap:

```ts
interface FieldConfig {
  flaskCount: number;          // total flasks to attempt
  maxPhysicsFlasks: number;    // budget; overflow becomes skeleton
  layerScale: number[];        // scale per tier; length === tier count
  skeletonBands: number;       // back N tiers are skeletons
  segmentRange: [number, number]; // min..max chain segments
  layout: "field" | "column";  // desktop spread vs mobile column
}
```

`generateFlasks(config, viewport)` is pure and deterministic (seeded RNG), and
returns `FlaskConfig[]`. It is the only place that knows about tiers, the
skeleton cutoff (`layer >= tierCount - skeletonBands`), the physics budget, and
icon assignment (icons handed to non-skeleton flasks in priority order until the
skill list is exhausted).

## 6. Scaling math (the actual fix)

**Physics bodies scale with `scale`:**
- `createFlaskBody(lastSeg, lastSegH, scale, opts)`: trapezoid of
  `FLASK_HITBOX_WIDTH*scale × FLASK_HITBOX_HEIGHT*scale`, positioned
  `lastSegH/2 + (FLASK_HITBOX_HEIGHT*scale)/2` below the last segment; constraint
  `pointB.y = -(FLASK_HITBOX_HEIGHT*scale)/2`.
- `createChainBodies(anchorX, anchorY, segmentCount, scale)`: each segment is
  `CHAIN_SEGMENT_WIDTH*scale` wide and `getSegmentHeight(i)*scale` tall; vertical
  accumulation and all constraint offsets use the scaled heights. Chains thus
  thin **and** shorten proportionally (correct perspective; back flasks hang
  less far).

**Visual matches by sharing a center, not by fudging:**
- The flask `<div>` stays base-sized (`FLASK_WIDTH × FLASK_HEIGHT`) and is
  centered on the body center with `transform-origin: center`:
  `translate(bodyX - FLASK_WIDTH/2, bodyY - FLASK_HEIGHT/2) rotate(angle) scale(scale)`.
  Because the hitbox is also centered on the body and scales by the same factor,
  the glass and the green hitbox stay aligned at any depth.
- **`scaleOffsetY` is deleted.** If the art needs the cork to meet the chain, any
  residual is a single constant base offset (scaled once), not a
  `scale`-dependent term.
- Chain links: `translate(seg.pos) rotate(angle) scaleX(scale)`, height = scaled
  segment height (already `scaleX`; height now comes from scaled `segmentHeights`).

**Anchors:** mobile back-solves `anchorY` from chain length, which must use the
**scaled** cumulative segment heights. Desktop keeps the fixed off-screen anchor.

## 7. Placement strategies (one function, two configs)

- **Desktop (`layout: "field"`):** 5 tiers, `layerScale = [1.0, 0.82, 0.66, 0.5,
  0.36]`, `skeletonBands = 2`. Front 3 tiers physics (+ icons until 22 run out),
  back 2 tiers skeletons. Same-layer minimum spacing as today. Paint back→front.
- **Mobile (`layout: "column"`):** interactive foreground column (scale `1.0`,
  as today) **plus** ~3–4 background skeletons at two small scales (≈`0.5`,
  `0.36`) so the backdrop reads as two receding planes. No physics depth tiers.

## 8. Graphics quality + device detection

Each quality level is **just a `FieldConfig`** (desktop) / column variant
(mobile):

| | low | medium | high |
|---|---|---|---|
| physics flasks (`maxPhysicsFlasks`) | ~8 | ~18 (all icons) | ~26 (empty-physics mixed in) |
| skeleton bands | 3 | 2 | 2 |
| chain `segmentRange` | short | normal | normal |

**`quality: 'auto' | 'low' | 'medium' | 'high'`** in `useAppStore` (persisted).
`auto` resolves to a concrete level via:
- mobile / coarse pointer → mobile column config (own light budget)
- `prefers-reduced-motion` → `low` (accessibility)
- `navigator.hardwareConcurrency`: `<4 → low`, `4–8 → medium`, `>8 → high`;
  `navigator.deviceMemory` (when present) caps the result
- **Runtime FPS probe:** sample the first ~1s the rack is active; if mean FPS is
  below ~45, drop one level. This is the reliable signal — see caveat.

**Honest caveat — no real GPU detection.** Browsers gate the WebGL renderer
string for privacy, so "has a dedicated GPU" cannot be reliably read. We
therefore detect *capability by outcome* (CPU/RAM hints + the FPS probe), which
measures what actually matters: does it run smoothly.

## 9. Store + settings

- Add `quality` (+ setter) to `useAppStore`; include in `partialize` so it
  persists. `deviceInfo` already exists and feeds detection.
- Add a quality selector (Auto / Low / Medium / High) to `SettingsPanel`.
- `PhysicsScene` derives the active `FieldConfig` from `quality` (+ resolved
  `auto`) and `isMobile`, then feeds `generateFlasks`.

## 10. Performance

- **Skeletons are free:** static, positioned once, no engine bodies, no rAF
  sync. More skeletons ≠ more cost.
- **`maxPhysicsFlasks` budget** bounds simulated bodies regardless of tier
  counts (overflow → skeleton).
- **Loop consolidation:** collapse the ~20 per-flask `syncDom` RAF loops into the
  single existing frame loop via a subscriber registry (port the POC's
  `flaskFieldLoop.ts` pattern: one RAF drives `Engine.update` then every
  registered sync). Sleeping flasks still skip their own DOM writes. Pays off at
  `high`.

## 11. Files affected

- `src/physics/constants.ts` — replace `DEPTH_SCALE`/`DEPTH_OPACITY` with
  `LAYER_SCALE`; add `SKELETON_BANDS`, quality `FieldConfig` presets, base sizes
  stay.
- `src/physics/generateFlasks.ts` (**new**, extracted + pure) + `*.test.ts`.
- `src/physics/fieldConfig.ts` (**new**) — `FieldConfig` type + presets +
  `resolveQuality()` detection.
- `src/physics/createFlaskBody.ts`, `createChainBodies.ts` — take `scale`.
- `src/components/physics/FlaskChain.tsx` — `isSkeleton` prop drives static path;
  visual centered on body; delete `scaleOffsetY`; subscribe to shared loop
  instead of own RAF.
- `src/components/physics/PhysicsScene.tsx` — derive `FieldConfig` from quality +
  mobile; consume new layout.
- `src/hooks/useAnimationSync.ts` (or a new `useFrameLoop`) — own the subscriber
  registry for the consolidated loop.
- `src/store/useAppStore.ts` — `quality` state (persisted).
- `src/components/settings/SettingsPanel.tsx` — quality selector.

## 12. Testing

- **`generateFlasks` unit tests** (pure, no React/Matter): deterministic by
  seed; correct `scale` per tier; `isSkeleton` set exactly for back
  `skeletonBands` tiers and for over-budget flasks; icons only on non-skeletons,
  capped at skill count; empty-physics appears iff physics count > 22; mobile
  produces a column + the expected background skeletons.
- **`resolveQuality` unit tests:** heuristic mapping (cores/memory/mobile/
  reduced-motion) with injected inputs; FPS-probe downgrade logic in isolation.
- **Manual / browser:** debug overlay shows green hitbox wrapping the glass at
  every tier; quality switch in settings changes density live; reduced-motion →
  low. (Note: in-session Chrome tab is hidden so rAF/RO are paused — physics
  motion can't be verified in-session, only DOM/data; the human verifies feel.)

## 13. Implementation phases

1. **Model + `FieldConfig` refactor:** extract pure `generateFlasks(config)`;
   add `scale`/`isSkeleton`; scale physics bodies + chains; center the visual /
   delete `scaleOffsetY`; wire `FlaskChain` skeleton path. Lean default config.
   Tests for `generateFlasks`. Debug overlay should now align.
2. **Quality + detection + settings + loop consolidation:** `fieldConfig.ts`
   presets + `resolveQuality` (+ FPS probe); store `quality`; `SettingsPanel`
   control; consolidate RAF loops. Tests for `resolveQuality`.

## 14. Tunables (single place, `constants.ts` / presets)

```
LAYER_SCALE        = [1.0, 0.82, 0.66, 0.5, 0.36]   // desktop tiers (5)
SKELETON_BANDS     = low 3 / medium 2 / high 2       // per-quality (FieldConfig)
MAX_PHYSICS_FLASKS = low ~8 / medium ~18 / high ~26  // per-quality
FPS_DOWNGRADE      = 45
```
`LAYER_SCALE` is shared (its length defines the 5 desktop tiers); `skeletonBands`
and `maxPhysicsFlasks` are per-quality fields on each `FieldConfig` preset.
Open knob: whether the front tier may exceed `1.0` to "pop" (default `1.0`).
