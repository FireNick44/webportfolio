# Flask chain physics by tier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the `high` graphics tier, simulate every chain link of every flask (no static-top "skeleton" segment). On medium/low keep the existing 6-link cap but tighten the upper damping so the static→physics seam reads as one continuous rope.

**Architecture:** Move the per-chain physics-segment cap from a global constant into the per-tier `FieldConfig`. Thread it through the existing `fieldConfigFor → PhysicsScene → FlaskChain` flow, where it replaces the constant in the `staticCount` calculation. `createChainBodies` already accepts `staticCount` — no signature change there. One physics constant (`dampTop`) is bumped in `createChainBodies` to make the top of medium/low chains sit steadier.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Matter.js · vitest · Zustand (for `graphicsTier`, already wired).

**Spec:** [`docs/superpowers/specs/2026-05-27-flask-chain-physics-by-tier-design.md`](../specs/2026-05-27-flask-chain-physics-by-tier-design.md)

**Auth gates** (per `web/AGENTS.md`): `npx tsc --noEmit` and `npm test`. `next build` does NOT run ESLint and `npm run lint` reports pre-existing warnings — don't chase them.

---

## File map

| File | Change |
|---|---|
| `web/src/physics/fieldConfig.ts` | Add `maxPhysicsSegments: number` to `FieldConfig`; set on every preset (high = `Number.POSITIVE_INFINITY`, others = `MAX_PHYSICS_SEGMENTS`). Import the constant from `./constants`. |
| `web/src/physics/fieldConfig.test.ts` | **New.** Verify `fieldConfigFor` returns the expected `maxPhysicsSegments` per tier. |
| `web/src/components/physics/PhysicsScene.tsx` | Hoist `fieldConfigFor` call out of the `flasks` `useMemo` into its own memo. Pass `cfg.maxPhysicsSegments` as a prop to every `FlaskChain`. |
| `web/src/components/physics/FlaskChain.tsx` | Accept optional `maxPhysicsSegments` prop (defaults to `MAX_PHYSICS_SEGMENTS`). Use it instead of the constant in the `staticCount` calc. |
| `web/src/physics/createChainBodies.ts` | Tune `dampTop` `0.7 → 0.92`. |

No other files change. `MAX_PHYSICS_SEGMENTS` stays in `physics/constants.ts` as the default for the non-high tiers (single source of truth).

---

## Task 1: Add `maxPhysicsSegments` to `FieldConfig` + presets

**Files:**
- Create: `web/src/physics/fieldConfig.test.ts`
- Modify: `web/src/physics/fieldConfig.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/physics/fieldConfig.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { fieldConfigFor } from "./fieldConfig";
import { MAX_PHYSICS_SEGMENTS } from "./constants";

describe("fieldConfigFor — maxPhysicsSegments per tier", () => {
  it("high tier simulates every chain link (no static top)", () => {
    const cfg = fieldConfigFor("high", false);
    expect(cfg.maxPhysicsSegments).toBe(Number.POSITIVE_INFINITY);
  });

  it("medium tier keeps the default cap", () => {
    const cfg = fieldConfigFor("medium", false);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });

  it("low tier keeps the default cap", () => {
    const cfg = fieldConfigFor("low", false);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });

  it("off tier keeps the default cap (irrelevant but defined)", () => {
    const cfg = fieldConfigFor("off", false);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });

  it("mobile keeps the default cap regardless of tier", () => {
    const cfg = fieldConfigFor("high", true);
    expect(cfg.maxPhysicsSegments).toBe(MAX_PHYSICS_SEGMENTS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd ~/dev/webportfolio/web && npx vitest run src/physics/fieldConfig.test.ts
```
Expected: **FAIL** — `Property 'maxPhysicsSegments' does not exist on type 'FieldConfig'` (TypeScript error) OR `cfg.maxPhysicsSegments` is `undefined` and assertions fail.

- [ ] **Step 3: Add the field to the interface + presets**

Open `web/src/physics/fieldConfig.ts`.

1. Add the import at the top of the file, replacing the existing `LAYER_SCALE` import:

```ts
import { LAYER_SCALE, MAX_PHYSICS_SEGMENTS } from "./constants";
```

2. Add to the `FieldConfig` interface (insert after the existing `maxPhysicsFlasks` line):

```ts
  /** Per-chain cap on simulated links. Links above this in one chain are
   *  drawn as a static rope. `Number.POSITIVE_INFINITY` simulates every link. */
  maxPhysicsSegments: number;
```

3. Add `maxPhysicsSegments: MAX_PHYSICS_SEGMENTS,` to `DESKTOP_DEFAULT` (after `maxPhysicsFlasks: 18,`).

4. Add `maxPhysicsSegments: MAX_PHYSICS_SEGMENTS,` to `MOBILE_CONFIG` (after `maxPhysicsFlasks: 36,`).

5. In `FIELD_BY_TIER`, add `maxPhysicsSegments` to each preset:
   - `off`: `maxPhysicsSegments: MAX_PHYSICS_SEGMENTS,`
   - `low`: `maxPhysicsSegments: MAX_PHYSICS_SEGMENTS,`
   - `medium`: inherits via spread `{...DESKTOP_DEFAULT, ...}` — nothing to add.
   - `high`: `maxPhysicsSegments: Number.POSITIVE_INFINITY,`

After the edits the `high` preset should read:
```ts
high: { flaskCount: 44, maxPhysicsFlasks: 26, maxPhysicsSegments: Number.POSITIVE_INFINITY, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 16], layout: "field", bgSkeletons: 32, coverSkeletons: 18 },
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd ~/dev/webportfolio/web && npx vitest run src/physics/fieldConfig.test.ts
```
Expected: **PASS — 5 tests**.

- [ ] **Step 5: Run typecheck**

Run:
```bash
cd ~/dev/webportfolio/web && npx tsc --noEmit
```
Expected: exit 0, no output. (`fieldConfig.ts` is referenced from `PhysicsScene.tsx`; tsc verifies the interface change is consistent everywhere it's used — at this point `PhysicsScene` doesn't read the new field yet but the addition is backward-compatible because the field is required only on new construction.)

If tsc reports `Property 'maxPhysicsSegments' is missing in type ...` for any literal that builds a `FieldConfig`, fix that literal too — the test in Step 1 only exercises `fieldConfigFor`, but every preset must satisfy the interface.

- [ ] **Step 6: Commit**

```bash
cd ~/dev/webportfolio && git add web/src/physics/fieldConfig.ts web/src/physics/fieldConfig.test.ts && git commit -m "feat(physics): add maxPhysicsSegments to FieldConfig (high = Infinity)"
```

---

## Task 2: Thread `maxPhysicsSegments` from `PhysicsScene` into `FlaskChain`

**Files:**
- Modify: `web/src/components/physics/PhysicsScene.tsx`
- Modify: `web/src/components/physics/FlaskChain.tsx`

Test strategy: this is React/TSX prop plumbing — verified by `tsc --noEmit` and the existing `createChainBodies` tests, plus a visual smoke check at the end of Task 4. No new unit test.

- [ ] **Step 1: Accept the new prop in `FlaskChain`**

Open `web/src/components/physics/FlaskChain.tsx`.

1. In the imports from `@/physics/constants`, `MAX_PHYSICS_SEGMENTS` is already there — keep it. No import change.

2. In the `Props` interface, add (insert after the existing `scale?: number;` line):

```ts
  /** Per-chain cap on simulated links — top `segmentCount - maxPhysicsSegments`
   *  links render as a static rope. Defaults to MAX_PHYSICS_SEGMENTS (=6). */
  maxPhysicsSegments?: number;
```

3. In the function destructure, add the prop with the default. Find:
```ts
  scale = 1,
  isSkeleton = false,
```
and change to:
```ts
  scale = 1,
  isSkeleton = false,
  maxPhysicsSegments = MAX_PHYSICS_SEGMENTS,
```

4. Replace the `staticCount` computation. Find:
```ts
  const staticCount = isStatic
    ? segmentCount
    : Math.max(0, segmentCount - MAX_PHYSICS_SEGMENTS);
```
and change to:
```ts
  const staticCount = isStatic
    ? segmentCount
    : Math.max(0, segmentCount - maxPhysicsSegments);
```

(That's the only `MAX_PHYSICS_SEGMENTS` reference in `FlaskChain.tsx`.)

- [ ] **Step 2: Hoist the config in `PhysicsScene` and pass the prop**

Open `web/src/components/physics/PhysicsScene.tsx`.

1. Find this block (around line 109–130):
```tsx
  const flasks = useMemo(() => {
    if (dims.width === 0) return [];
    const config = fieldConfigFor(tier, isMobile);
    const skillPaths = skills.map((s) => s.svgPath);
```

2. Hoist `config` out of the memo so it's also available to the render. Replace the lines above with:
```tsx
  const config = useMemo(
    () => fieldConfigFor(tier, isMobile),
    [tier, isMobile],
  );
  const flasks = useMemo(() => {
    if (dims.width === 0) return [];
    const skillPaths = skills.map((s) => s.svgPath);
```

Note: `config` is now a stable memoized value that depends only on `tier` and `isMobile`. The outer `flasks` memo no longer needs to call `fieldConfigFor` itself — it can reference `config` directly. Inside `flasks` useMemo, replace the existing `config` references (the call to `generateFlasks(config, …)`) — no rename needed, the name is the same.

3. The `flasks` useMemo dependency array currently is:
```ts
  }, [dims.width > 0, isMobile, dims.height, tier, layoutSeed, randomizeShapes]);
```
Add `config` (and the eslint-disable comment is already there). Final:
```ts
  }, [dims.width > 0, isMobile, dims.height, tier, layoutSeed, randomizeShapes, config]);
```

4. Pass the new prop to `FlaskChain`. Find the `<FlaskChain` JSX (around line 215) and add this prop (immediately after `scale={cfg.scale}`):
```tsx
              maxPhysicsSegments={config.maxPhysicsSegments}
```

The full set of props on `FlaskChain` should now include `maxPhysicsSegments={config.maxPhysicsSegments}` somewhere in the list.

- [ ] **Step 3: Run typecheck**

Run:
```bash
cd ~/dev/webportfolio/web && npx tsc --noEmit
```
Expected: exit 0, no output.

If tsc errors with `config is not defined` inside the `flasks` useMemo, you forgot to keep the reference inside the inner memo body. Re-read Step 2.2.

- [ ] **Step 4: Run all tests**

Run:
```bash
cd ~/dev/webportfolio/web && npm test
```
Expected: **all tests pass** (66 tests after Task 1; existing physics/layout tests untouched).

- [ ] **Step 5: Commit**

```bash
cd ~/dev/webportfolio && git add web/src/components/physics/PhysicsScene.tsx web/src/components/physics/FlaskChain.tsx && git commit -m "feat(physics): plumb maxPhysicsSegments through PhysicsScene -> FlaskChain"
```

---

## Task 3: Tighten upper-chain damping in `createChainBodies`

**Files:**
- Modify: `web/src/physics/createChainBodies.ts`

This makes the top physics link sit steadier on medium/low (where a static top still sits above it), masking the static→physics seam. A constant tweak; no new test — verified by existing `createChainBodies` tests + visual check.

- [ ] **Step 1: Bump `dampTop`**

Open `web/src/physics/createChainBodies.ts`. Find:
```ts
  const stiffTop = 0.99;
  const stiffBot = CHAIN_STIFFNESS; // 0.92, current default
  const dampTop = 0.7;
  const dampBot = CHAIN_DAMPING; // 0.45
```

Note: the inline comments for `stiffBot` (says `0.92`) and `dampBot` (says `0.45`) are stale — the actual constants in `physics/constants.ts` are `CHAIN_STIFFNESS = 1` and `CHAIN_DAMPING = 0.1`. The behavior follows the constants, not the comments. Leave the stale comments alone (out of scope); only change `dampTop`.

Change to:
```ts
  const stiffTop = 0.99;
  const stiffBot = CHAIN_STIFFNESS; // 0.92, current default
  const dampTop = 0.92; // bumped from 0.7 — top physics link sits steadier so
                       // the static→physics seam on medium/low reads as one
                       // continuous rope instead of a visible joint.
  const dampBot = CHAIN_DAMPING; // 0.45
```

- [ ] **Step 2: Run all tests**

Run:
```bash
cd ~/dev/webportfolio/web && npm test
```
Expected: **all tests pass.** The constants themselves aren't asserted by tests; existing tests assert structural properties (segment counts, anchor pin location, scale behavior) that are independent of damping.

- [ ] **Step 3: Run typecheck**

Run:
```bash
cd ~/dev/webportfolio/web && npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd ~/dev/webportfolio && git add web/src/physics/createChainBodies.ts && git commit -m "feat(physics): bump dampTop 0.7 -> 0.92 to mask static->physics seam"
```

---

## Task 4: Full verification + manual visual check

**Files:** none changed in this task.

- [ ] **Step 1: Run authoritative gates**

```bash
cd ~/dev/webportfolio/web && npx tsc --noEmit && npm test
```
Expected: tsc exit 0, all vitest tests pass.

- [ ] **Step 2: Build the production bundle**

```bash
cd ~/dev/webportfolio/web && npm run build
```
Expected: `✓ Compiled successfully`, no TypeScript errors, all 9 static pages generated, `ƒ Proxy (Middleware)` reported.

- [ ] **Step 3: Serve on the LAN for phone preview**

If port 3000 is already in use, free it first:
```bash
lsof -ti :3000 -sTCP:LISTEN | xargs -r kill -TERM
```

Then:
```bash
cd ~/dev/webportfolio/web && npm run mobile
```
This rebuilds and serves at `http://<LAN-IP>:3000`. Open on your phone.

- [ ] **Step 4: Visual acceptance check**

On the page, open the technical/version panel and switch graphics tier (the `useAppStore.graphicsTier` setting; controls live in `/technical` page).

Acceptance:
- **high tier:** Every link of every long chain swings (no visibly static prefix at the top). Tug a flask — the entire chain reacts.
- **medium tier:** Long chains still have a static top, but the topmost physics link no longer "kicks" — the transition into the swinging portion reads as smooth rope.
- **low tier:** Same as medium — steadier seam.
- **off / reduced-motion:** Fully static rack, unchanged.

If high-tier fps drops (rack feels chunky or input lag), fall back: in `web/src/physics/fieldConfig.ts`, change `maxPhysicsSegments: Number.POSITIVE_INFINITY` on the `high` preset to a finite cap (`12` is a good first try). Re-run gates and serve again.

- [ ] **Step 5: Final commit (if no fixups needed)**

If no fps fallback was applied, there's nothing more to commit — Tasks 1–3 already committed everything. Confirm:

```bash
cd ~/dev/webportfolio && git status -s
```
Expected: any unrelated working-tree changes (concurrent agents) are left alone; nothing of ours unstaged.

If a fallback was applied, commit it:
```bash
cd ~/dev/webportfolio && git add web/src/physics/fieldConfig.ts && git commit -m "perf(physics): cap high-tier maxPhysicsSegments at 12 (fps fallback)"
```

---

## Self-review

1. **Spec coverage** — Each spec section maps to a task:
   - "Config field" → Task 1 (interface + presets, with test).
   - "Plumbing changes" → Task 2 (PhysicsScene + FlaskChain).
   - "Damping ramp tweak" → Task 3.
   - "Tests" — spec called for one additional createChainBodies test for the `staticCount=0` path; that case is **already covered** by an existing test (`createChainBodies skeleton (partial physics) → defaults to a fully-physics chain when staticCount is 0`). The new behavior added by this work is the per-tier mapping, which is tested in Task 1. No gap.
   - "Perf risk + mitigation" → Task 4 Step 4 (the in-place fallback).

2. **Placeholder scan** — no "TBD", "TODO", "appropriate", "etc." in step bodies. All test code and edit code is concrete.

3. **Type consistency** — `maxPhysicsSegments: number` everywhere it appears (`FieldConfig` interface, presets, prop type, default value). `Number.POSITIVE_INFINITY` is a valid `number` in TS. The prop type is optional (`?`) with a default in the destructure — same pattern as `scale = 1` already on `FlaskChain`.

4. **Files** — every step names exact paths; commands are absolute or `cd`-prefixed.
