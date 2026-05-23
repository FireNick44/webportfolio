# Flask Rack (Matter.js physics)

The flask rack is the interactive centrepiece of the **Skills** section: a row of
colourful flasks hanging on chains from a wavy "surface," simulated with
Matter.js. Each interactive flask carries a skill icon; you can drag/stir them
with the cursor (desktop) or a finger (mobile). Deeper, smaller flasks are static
"skeletons" that add depth without physics cost.

## Files

| File | Responsibility |
|------|----------------|
| `components/sections/Skills.tsx` | The section: intro copy + a `100vh` wrapper holding the scene. |
| `components/physics/PhysicsSceneClient.tsx` | `dynamic()` (client-only, no SSR) wrapper around the scene. |
| `components/physics/PhysicsScene.tsx` | Owns the engine, the container/measurement, walls, the frame loop, and renders one `FlaskChain` per generated flask. |
| `components/physics/FlaskChain.tsx` | One flask: builds its chain + body, syncs the DOM to the physics each frame. |
| `components/physics/FlaskSVG.tsx` | The flask art: glass body, liquid fill, and the skill-icon overlay. |
| `components/physics/ChainLinkSVG.tsx` | A single chain link. |
| `physics/generateFlasks.ts` | Pure, seeded layout: produces the `FlaskConfig[]` (positions, chain length, colour, layer, skeleton flag, icon). |
| `physics/fieldConfig.ts` | Per-tier + mobile field presets (`FieldConfig`). |
| `hooks/usePhysicsEngine.ts`, `hooks/useFrameLoop.ts`, `hooks/useMousePhysics.ts` | Engine lifecycle, the shared rAF loop, and cursor/touch interaction. |
| `data/skills.json` + `public/skills/*.svg` | Skill icon definitions and assets. |

## How a layout is generated

`generateFlasks(config, viewport, skillPaths, seed = 42)` is **pure and seeded**
(`mulberry32(42)`), so the rack is deterministic across renders. It returns a
`FlaskConfig[]`:

```
{ xPct, anchorY, segments, color, scale, isSkeleton, layer, skillIcon? }
```

- **Layers / depth.** `config.layerScale` lists a scale per tier, front→back. The
  back `skeletonBands` tiers are always skeletons.
- **Skeletons.** A flask is a skeleton if it's in a skeleton band **or** over the
  `maxPhysicsFlasks` budget. Skeletons are static (no physics, no rAF, no icon) —
  this is how `off` tier / reduced-motion produces a fully static rack
  (`maxPhysicsFlasks: 0`).
- **Skill icons** are shuffled (seeded) and handed only to non-skeleton flasks.
- **Two layouts:** `field` (desktop — flasks scattered across tiers) and `column`
  (mobile — a long central stack; see below).

## Tiers (shared with the outro)

`fieldConfigFor(tier, isMobile)` picks the preset. The same `useGraphicsTier()`
drives both this rack and the [underwater outro](./underwater-outro.md).

| Tier (desktop `field`) | ~physics flasks |
|------|------|
| `off` | 0 (all skeletons, static) |
| `low` | ~8 |
| `medium` | ~18 (default) |
| `high` | ~26 |

**Mobile (`column`)** ignores the tier preset and uses `MOBILE_CONFIG`: a denser
vertical stack — 7 interactive flasks with longer (5–9 segment) chains spread
down a central column (`bodyFrac` 0.26→0.84) plus ~6 background skeletons, so
there's plenty to grab and swing on a narrow screen. Mobile also sets
`noFlaskCollision`, so stacked bottles pass through each other instead of fighting.

## Scene mechanics (`PhysicsScene`)

- **Container.** `position: sticky; top: 0; height: 100vh` inside a `100vh`
  wrapper, so the rack fills exactly one viewport with no empty overhang. A
  `ResizeObserver` feeds `dims`; the layout regenerates when size/tier change.
- **Walls.** A top wall plus a curved **dome** bottom (segments angled so flasks
  slide off to the sides instead of piling up) — no side walls, so bottles can
  drift off-screen.
- **Frame loop.** `useFrameLoop` runs the engine only while `active && tier !==
  "off"`. `FlaskChain` syncs each flask's DOM transform to its body per frame.
- **Virtualization.** An `IntersectionObserver` sets `active`; off-screen, the
  engine and DOM sync pause entirely (near-zero CPU).
- **Interaction.** `useMousePhysics` wires Matter's mouse/touch so the cursor
  repels/drags flasks; the first interaction dismisses the "drag/stir" hint
  (remembered for the session).
- **Waves.** Two `WaveDivider`s render *after* the flasks so bottles tuck behind
  the surface top and bottom. Advanced/diagnostic mode hides the top wave and
  overlays the Matter.js wireframes + stats.

## Gotchas

- `generateFlasks` is imported by tests with a **relative** path (there's no
  vitest path-alias config). Keep it pure and side-effect free.
- Gate changes on `npx tsc --noEmit` + `npm test` (vitest). `next build` is fine
  too (Next 16 doesn't lint during build); `npm run lint` still flags pre-existing
  `reactCompiler` warnings unrelated to feature work.
