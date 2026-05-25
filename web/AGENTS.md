<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Portfolio site — project guide

The live personal-portfolio app. Its signature piece is a physics-driven **flask
rack** in the Skills section — skill "flasks" hang on chains (Matter.js) and react
to cursor/touch — plus an **underwater outro** scene. (The repo root also holds a
legacy `flask-physics-poc/` Vite POC; it is NOT the live app — ignore it.)

## Tech stack
- Next.js 16 (App Router, React 19, TypeScript strict, `reactCompiler: true`)
- matter-js (physics), Zustand + persist (`useAppStore`), Tailwind, i18n (en/de)
- vitest (node env) for the pure physics/layout logic

## Commands & gates
- Dev `npm run dev` · Build `npm run build` · Test `npm test` (vitest)
- **Authoritative gates: `npx tsc --noEmit` + `npm test`.** `next build` does NOT
  run ESLint and succeeds. `npm run lint` still reports pre-existing
  `reactCompiler` warnings (set-state-in-effect; a memo-deps expression in
  PhysicsScene) that are unrelated to feature work — don't chase them. Do NOT add
  an `eslint` key to `next.config.ts` (unrecognized in Next 16; trips tsc).

## Flask rack (`src/`)
Pure, tested layout logic is kept separate from rendering:
- `physics/generateFlasks.ts` — `generateFlasks(config, viewport, skillPaths, seed)
  → FlaskConfig[]`. Body-aware 2D placement (random x, no overlap); z-ordered
  back-to-front by hanging depth.
- `physics/fieldConfig.ts` — `FieldConfig`, `FIELD_BY_TIER` (desktop, per tier),
  `MOBILE_CONFIG`, `fieldConfigFor(tier, isMobile)`.
- `physics/constants.ts` — sizes + tuning knobs: `LAYER_SCALE`, `TOP_LINE`,
  `BODY_OVERLAP_PAD`, `MAX_PHYSICS_SEGMENTS`, `MAX_RACK_WIDTH`,
  `MIN_SAME_LAYER_DISTANCE_PCT`.
- `physics/createChainBodies.ts`, `createFlaskBody.ts` — Matter bodies/constraints.
- `physics/frameLoop.ts` + `hooks/useFrameLoop.ts` — ONE shared rAF (fixed 1/60s
  step) runs `Engine.update` then every flask's DOM sync (no per-flask rAF).
- `components/physics/PhysicsScene.tsx` — scene: walls, mouse/touch, graphics tier,
  random layout seed per page load, icon-bob.
- `components/physics/{FlaskChain,FlaskSVG,ChainLinkSVG,FlaskHint}.tsx` — per-flask
  bodies, SVG, skill icon, first-run hint.
- `components/sections/Skills.tsx` — section wrapper (responsive height: tall
  scroll-through on mobile, sticky 100vh on desktop).
- `data/skills.json` — skill definitions · `public/skills/` — icon SVGs.

## Key behaviours
- **graphicsTier** (`off|low|medium|high`, in `useAppStore`) is SHARED with the
  underwater outro. `off` → fully static rack; reduced-motion → off, touch → cap
  low. Drives field density and the icon idle-bob.
- **Desktop** = a scattered "field"; **mobile** = a random, compact scatter
  ("column" layout) that shows ALL skills. Both use the same body-aware placement.
- Every **foreground-tier** flask shows a skill (icons are decoupled from physics);
  only `maxPhysicsFlasks` are interactive, the rest are static skill flasks.
  Back-tier flasks are icon-less decorative "skeletons".
- **Skeleton chains:** a chain longer than `MAX_PHYSICS_SEGMENTS` renders a static
  top rope and simulates only the bottom links near the flask (cheap long chains).
- **Layout is random per page refresh** (random seed in PhysicsScene); tests pass
  a fixed seed for deterministic assertions.
- Mobile physics flasks don't collide (`noFlaskCollision`); separation comes from
  the spread placement, not Matter collision.

## Gotchas
- **Mobile can't be visually verified in-session** (the dev tab/viewport won't
  shrink that far) — check mobile layout on a real device.
- This working tree is often edited by **concurrent agents** — be conservative
  with git (stage only the files you changed).
