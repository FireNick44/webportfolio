# beatloops project tile — design

## Context

Projects grid in `web/src/components/sections/Projects.tsx` lays out cards
from `web/src/data/projects.json` using span sizes (`default` 1×1,
`wide` 2×1, `large` 2×2) declared in `web/src/data/projects-layout.json`.

`Im.ProveYou` is currently `large` (2×2) at index 1. The user wants it
demoted and a new beatloops project featured in its slot, showing an
animated vinyl disc lifted from the (locally-cloned) beatloops repo.

## Goals

1. Demote `Im.ProveYou` from 2×2 to 1×1 and move it to the end of the
   project list.
2. Insert a new beatloops project at the freed slot (index 1), sized 2×1
   (`wide`).
3. Render the beatloops tile as a split layout — text on the left, a
   spinning vinyl disc on the right.
4. Override the indexed gradient palette for that single tile with a
   red→purple beatloops vibe.

## Non-goals

- No i18n per-card (project name/subtitle stay in `projects.json` as today).
- No new size tokens in `projects-layout.json`; reuse existing `wide`.
- No changes to the upstream `beatloops` repo.
- No new physics/layout test coverage (pure rendering).

## Data model — `web/src/data/projects.json`

- Remove `"size": "large"` from the `Im.ProveYou` entry.
- Move the `Im.ProveYou` entry to the end of the array.
- Insert at index 1 (right after `FOREVR`):

  ```json
  {
    "name": "BEATLOOPS",
    "subtitle": "DJ Portfolio",
    "tech": ["Tech Lead"],
    "url": "https://beatloops.ch/",
    "size": "wide",
    "variant": "beatloops"
  }
  ```

`variant` is a new optional string field on project entries. It is
consumed by `Projects.tsx` to switch render mode; unknown / absent
variants render as today.

## Layout

`wide` (2×1) already exists in `projects-layout.json` — no layout file
change. Tile height stays `rowHeight` (`11rem`).

## Components

### VinylDisk — new

Path: `web/src/components/sections/projects/VinylDisk.tsx`

Ported from `/Users/yannic/dev/beatloops/src/components/VinylDisk.tsx`.

Geometry preserved 1:1:
- `GRID = 15`
- `CENTER = 7.0`
- `MAX_RADIUS = 7.2`
- `HOLE_RADIUS = 1.0`
- 24 rotation frames
- Circle clip on the wrapper (`clipPath: circle(50% at center)`)
- Two stacked grids:
  1. static groove dots — `#1a1a1a`
  2. spinning arms — white, opacity `0.92`

Dependency change vs the source: drop
`@/components/animate-ui` (`MotionGrid` / `MotionGridCells`).
Re-implement a slim version using `motion/react` (already in `web/`
deps), plus plain `useState` + `setInterval` for the frame index. No
new package installs.

Public API:

```ts
interface VinylDiskProps {
  size?: number;   // default 140
  speed?: number;  // ms per frame; default 110
}
```

Transparent ground: dots are absolutely placed in a CSS grid; non-active
cells use `background: transparent` so the tile gradient shows through
the gaps (matches beatloops original).

### Projects.tsx — modified

Branch inside the existing `.map` on `p.variant === "beatloops"`:
- Render an alt inner body: two-column flex split (`flex` row with a
  `flex-1` text column on the left and a fixed-width disc column on the
  right, ~150px wide).
- Outer `<a>`, sheet-beneath span, `group-hover` paper-slide transition,
  gradient `<span>`, white-wash `<span>`, and `secret` button branch all
  stay identical to today.
- The text column matches the current layout (mono number, title,
  subtitle, tech tag, hover ArrowUpRight) so the tile feels consistent
  with siblings.

Gradient override:
- `cardGradient(i)` gains a `variant?: string` parameter. When
  `variant === "beatloops"`, return
  `linear-gradient(135deg, #ff3b6b 0%, #8b3bff 100%)`. Otherwise return
  the indexed gradient as today.

### projectsLayout.ts

No change. `variant` lives on project entries, not on the layout config.

## Type-narrowing

Add `variant?: string` to whatever inline shape `projects.json`
satisfies. Existing entries (without `variant`) keep parsing. Render
guard is `"variant" in p && p.variant === "beatloops"`, mirroring the
existing `"size" in p` / `"secret" in p` pattern.

## Files touched

- mod: `web/src/data/projects.json`
- mod: `web/src/components/sections/Projects.tsx`
- new: `web/src/components/sections/projects/VinylDisk.tsx`

## Test gates

- `npx tsc --noEmit`
- `npm test` (vitest)

Per `web/AGENTS.md`. No `eslint` key in `next.config.ts`. No new vitest
needed — pure rendering, no physics/layout logic changes.

## Risks

- The disc renders white arms on a colored gradient — readability on
  the red→purple wash should be acceptable but worth eyeballing on
  desktop after build. The white-wash overlay applies under the disc
  too, which softens the gradient and helps contrast.
- 24-frame `setInterval` runs even when the tile is offscreen. Acceptable
  given the cost (one `setState` every 110ms) and matches beatloops
  upstream behaviour; revisit only if scrolling jank shows up.
- `aspect-ratio` / `h-full` Chromium-collapse gotcha (see project memory):
  the disc column uses an explicit pixel width, not aspect-square
  +h-full, so the bug does not apply.

## Out-of-scope follow-ups

- i18n of project subtitles / tech tags.
- Sharing the disc renderer between portfolio and beatloops as a real
  package.
