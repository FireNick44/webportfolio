# Underwater Outro ("Reef")

The reef is the animated scene at the very bottom of every page — the footer
under "Thanks for stopping by." It's a layered, game-style underwater diorama
(pixel-art sprites + a procedural bubble canvas + swaying kelp/coral) that scales
its richness to the device via a single graphics tier.

> Reef is the **only** outro scene. The earlier `classic` / `deep` variants and
> the scene picker were removed; `OutroSection` always renders `ReefScene`.

## Files

| File | Responsibility |
|------|----------------|
| `components/outro/OutroSection.tsx` | The `<footer>`: renders `ReefScene`, a legibility scrim, and `OutroContent`. Native cursor (no custom cursor). |
| `components/outro/ReefScene.tsx` | Composes the whole scene + the z-stack; owns viewport-responsive density and the tier gates. |
| `components/outro/Octopus.tsx` | Cursor-aware octopus (avoids / is curious / flees + hides). |
| `components/outro/Crab.tsx` | Solo crab (continuous) + a separate periodic crab family; bidirectional. |
| `components/outro/Rook.tsx` | The big fish that occasionally cruises across (either direction). |
| `components/outro/Kelp.tsx` | CSS-sway kelp strands; subtle cursor reaction at high tier. |
| `components/outro/Coral.tsx` | A planted coral PNG with a gentle sway. |
| `components/outro/WaterCanvas.tsx` | Procedural bubble canvas; bubbles flee the cursor at high tier. |
| `components/outro/SandFloor.tsx` | Square-pixel sand canvas with a wavy top mask. |
| `components/layout/ByeSand.tsx` | The colourful layered SVG "wave" bands at the very bottom. |
| `hooks/useGraphicsTier.ts` + `lib/outro/tiers.ts` | The shared quality tier (also drives the flask rack). |
| `hooks/useSceneActive.ts` | True only when the scene is on-screen **and** the tab is visible. |
| `hooks/usePointerField.ts` | Per-frame pointer position/velocity, gated on the high tier. |

## Graphics tiers

`useGraphicsTier()` returns the *effective* tier from the user's Settings choice
capped by the device (`lib/outro/tiers.ts` → `resolveGraphicsTier`):

- **reduced-motion** → `off`
- **no fine pointer** (touch devices) → capped at `low`

| Tier | What renders |
|------|--------------|
| `off` | Fully static — SVG backdrop + sprites parked, no rAF. |
| `low` | SVG backdrop + CSS sway + ambient creatures (octopus, crab, rook, kelp). **This is what phones get.** No bubble canvas, no cursor interaction. |
| `medium` | + the `WaterCanvas` bubbles. |
| `high` | + cursor interaction: octopus avoids/flees, kelp reacts, bubbles flee the cursor. Desktop + fine pointer only. |

`ReefScene` derives three booleans and passes them down:
`creaturesOn = atLeast(tier,"low") && active`, `canvasOn = atLeast(tier,"medium") && active`,
`interactive = atLeast(tier,"high") && active`, where `active` comes from
`useSceneActive` (so everything pauses when scrolled away or the tab is hidden).

## Layering (front ← back)

front Kelp (`z9`) · Octopus (`z8`) · Crab (`z6`) · Coral + SandFloor (`z5`) ·
bg Kelp (`z4`) · Rook (`z3`) · ByeSand wave (`z2`) · WaterCanvas · gradient wash ·
darkened `intro-bg.svg`. The footer adds a top scrim (`z0`) so creatures never
hurt the legibility of the heading/footer text.

## Creatures

- **Octopus** — reacts to the *real* cursor (we can't move the OS cursor, so it
  never grabs it): smoothly steers away from a moving/approaching cursor; is
  curious about a still cursor (drifts closer but keeps `MIN_DIST`); persistent
  close "hunting" builds a scare meter → it flees off-screen to hide, then sneaks
  back. State machine: `wander` ↔ `hide`.
- **Crab** — two independent walkers animated as directly-transformed `<img>`s
  (a 0×0 wrapper would not render — see the gotcha below): a **solo** crab loops
  continuously, and a separate **family** (lead + two trailing) strolls by with
  gaps. Each pass picks a random direction and flips the sprite to face it.
- **Rook** (big fish) — occasional crossings (~every 12–26 s), random
  direction/height/speed with an undulating path; flipped to face travel.
- **Kelp** — CSS keyframe sway; at high tier each strand adds a subtle eased
  wobble when the cursor is actually over its hitbox (no flip, no flicker).
- **Coral** — transparent PNGs (de-fringed from the source JPEGs with a graded
  near-white→alpha ramp + 1 px erosion so there's no white halo over dark water).

## Responsive / mobile

`ReefScene` tracks `vw` and scales density: kelp counts, coral scale (`0.62`
mobile / `0.8` tablet / `1`), and on mobile the pixel `SandFloor` is nudged down
(`translate-y`) so more of the colourful wave shows. The bottom black bar on a
phone is the iOS safe-area / home-indicator inset (an OS thing, not the page).

## Gotchas

- **rAF sprites must transform the visible `<img>` directly**, never a 0×0
  wrapper `<div>` — wrapping makes them vanish (cost us several rounds on the crab).
- **The native OS cursor cannot be moved from a web page** — there is no API.
  That's why the octopus only *reacts* to the cursor; an earlier custom-cursor
  "steal" gag was removed.
- **The dev server doesn't run on iOS** (the unminified multi-MB bundle is too
  heavy for iOS WebKit — page loads but never hydrates). Test mobile against a
  **production build** (`npm run build && npm start`). The deployed site is fine.
