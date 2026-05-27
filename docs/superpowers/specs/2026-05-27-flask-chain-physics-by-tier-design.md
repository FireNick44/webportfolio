# Flask chain physics by tier — design

**Date:** 2026-05-27
**Area:** `web/src/physics`, `web/src/components/physics`
**Goal:** On the **high** graphics tier, run *every* chain link through Matter.js (no static-top "skeleton" segment). On lower tiers keep the existing 6-link cap, but tighten the upper-physics damping so the static→physics seam reads as a single continuous rope instead of a visible joint.

## Background

`createChainBodies` already supports a `staticCount` parameter: the top N links of a chain are positioned once (no bodies) and only the bottom links are simulated. The cap comes from `MAX_PHYSICS_SEGMENTS = 6` in `physics/constants.ts` and is applied uniformly in `FlaskChain.tsx`:

```ts
const staticCount = isStatic ? segmentCount : Math.max(0, segmentCount - MAX_PHYSICS_SEGMENTS);
```

That's a global constant. Long chains (up to 16 links on desktop) therefore always carry a static rope on top, regardless of graphics tier. On high tier we have headroom to simulate the full chain; we just have no way to ask for it.

## Architecture

Move the cap from a global constant into the per-tier `FieldConfig` so it travels through the existing config plumbing:

```
fieldConfigFor(tier, isMobile) → FieldConfig
  ↓ (already passed by PhysicsScene)
PhysicsScene reads cfg.maxPhysicsSegments
  ↓ (new prop)
FlaskChain receives maxPhysicsSegments
  ↓
staticCount = max(0, segmentCount - maxPhysicsSegments)
  ↓
createChainBodies(..., staticCount)  // signature unchanged
```

No new abstraction; just one more field on the same config object that already carries `maxPhysicsFlasks`, `segmentRange`, `skeletonBands`.

## Config values

`FieldConfig` gains a required field:

```ts
/** Per-chain cap on simulated links. Links above this in a single chain are
 *  drawn as a static rope. Set Infinity to simulate every link. */
maxPhysicsSegments: number;
```

Presets:

| Tier | `maxPhysicsSegments` |
|---|---|
| `high` | `Infinity` |
| `medium` | `MAX_PHYSICS_SEGMENTS` (= 6) |
| `low` | `MAX_PHYSICS_SEGMENTS` |
| `off` | `MAX_PHYSICS_SEGMENTS` (irrelevant when nothing simulates) |
| Mobile (`MOBILE_CONFIG`) | `MAX_PHYSICS_SEGMENTS` |

`MAX_PHYSICS_SEGMENTS` stays in `physics/constants.ts` as the default for non-high tiers (single source of truth, so any future re-tune is one number).

## Damping ramp tweak

In `createChainBodies.ts` the stiffness/damping ramp already runs top → bottom of the *physics* chain. Bump only the top end:

```diff
- const dampTop = 0.7;
+ const dampTop = 0.92;
```

`stiffTop` stays `0.99`. The bottom of the chain (near the flask) is unchanged at `CHAIN_STIFFNESS = 1`, `CHAIN_DAMPING = 0.1` so the flask still flops freely. The top physics link — the one welded to the static-rope pin on medium/low — sits much steadier; the seam reads as one continuous rope instead of "static, then suddenly swinging".

On high tier this also applies, but with `maxPhysicsSegments = Infinity` there is no static-physics seam to hide; the steadier top just means the first link below the anchor doesn't kick out. Acceptable.

## Plumbing changes

1. **`physics/fieldConfig.ts`** — add `maxPhysicsSegments` to the `FieldConfig` interface; set it on `DESKTOP_DEFAULT`, `MOBILE_CONFIG`, every preset in `FIELD_BY_TIER`. Import `MAX_PHYSICS_SEGMENTS` from `constants.ts` for the non-high defaults.
2. **`physics/constants.ts`** — no change to the export, but the constant is now also imported by `fieldConfig.ts` and `FlaskChain.tsx` may keep it as a typing fallback default.
3. **`physics/createChainBodies.ts`** — `dampTop` `0.7 → 0.92`.
4. **`components/physics/PhysicsScene.tsx`** — read `cfg.maxPhysicsSegments` (already destructures from `fieldConfigFor`), pass as a prop to every `FlaskChain` it renders.
5. **`components/physics/FlaskChain.tsx`** — accept `maxPhysicsSegments?: number` prop, default to `MAX_PHYSICS_SEGMENTS`. Replace the constant reference in `staticCount` with the prop.

## Data flow

```
GraphicsTier (Zustand store)
  → fieldConfigFor(tier, isMobile) → FieldConfig.maxPhysicsSegments
  → PhysicsScene passes prop to FlaskChain
  → FlaskChain.staticCount = max(0, segmentCount − maxPhysicsSegments)
  → createChainBodies(anchorX, anchorY, segmentCount, scale, staticCount)
```

No runtime tier switching is required: tier change unmounts/remounts the scene (current behavior), so flasks rebuild with the new cap.

## Error handling

`maxPhysicsSegments` is required on `FieldConfig`. Setting it incorrectly is a TypeScript error, not a runtime one. `Infinity` is a valid `number`; `Math.max(0, segmentCount - Infinity)` evaluates to `0` (no static top) which is exactly the desired behavior. `FlaskChain` clamps with `Math.max(0, ...)` so any non-finite or oversized value degrades to "no static top" rather than crashing.

## Testing

- `physics/createChainBodies.test.ts` — add one case: `createChainBodies(0, 0, 10, 1, 0)` returns `segments.length === 10`, `staticHeight === 0`. Existing tests cover the `staticCount > 0` path and are unchanged.
- `physics/generateFlasks.test.ts` — untouched (placement logic, not chain bodies).
- Manual: phone preview on high tier — long chains should swing along their entire length; no visible static prefix. On medium tier the static→physics seam should be less obvious than today.

## Performance risk

High tier currently caps `maxPhysicsFlasks` at `26`. With `maxPhysicsSegments = Infinity` and `segmentRange[1] = 16`, the worst case is roughly `26 × 16 = 416` chain bodies + their constraints + flasks. Matter.js handles this on desktop, but the bottleneck on consumer laptops is usually constraint solving, not body count. If fps drops:

- **First lever:** cap `high.maxPhysicsSegments` at a finite number (e.g. `12`). Single-number change in `fieldConfig.ts`.
- **Second lever:** raise `frictionAir` on chain segments slightly (currently `0.03`).
- **Third lever:** lower `high.maxPhysicsFlasks`.

The cap is the cheapest lever and is the recommended fallback if profiling shows trouble.

## Non-goals

- No change to fully-static skeleton flasks (`bgSkeletons`, `coverSkeletons`). They stay static — they're decorative depth, not part of the rack's interactive feel.
- No change to mobile config. Mobile already runs many bodies on lower-end hardware; promoting every link to physics is the wrong tradeoff there.
- No retire of `MAX_PHYSICS_SEGMENTS`. It stays as the default for the non-high tiers — single source of truth.
