# Generic Depth-Driven Flask Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one `scale` per flask the single source of truth that drives the physics body, chain, and visual together (fixing hitbox/visual drift), add a skeleton (static) flask concept decoupled from icons, route all field knobs through one `FieldConfig`, and add a graphics-quality setting with device detection.

**Architecture:** A pure `generateFlasks(config, viewport)` produces `FlaskConfig[]` (each with `scale` + `isSkeleton`). Physics body creators take `scale`. `FlaskChain` renders the visual centered on the (now scaled) body — no `scaleOffsetY`. A `FieldConfig` object (chosen by quality + device) parameterizes everything. Quality lives in the Zustand store and `SettingsPanel`. Per-flask RAF sync loops are consolidated into one frame loop.

**Tech Stack:** Next.js 16 / React 19 / TypeScript (strict), matter-js 0.20, Zustand 5 (persist), vitest (added in Task 1).

**Working dir:** All paths are under `web/`. Work in-place on branch `feature/flask-field-redesign` (the `web/` app is untracked in git, so worktrees are not usable). Run all commands from `web/`.

**Spec:** `docs/superpowers/specs/2026-05-22-generic-flask-depth-field-design.md`

**Skill count:** `src/data/skills.json` has **22** skills (the empty-physics threshold).

---

## File Structure

**Phase 1 — model + FieldConfig**
- `vitest.config.ts` (new) — node-env test runner.
- `src/physics/fieldConfig.ts` (new) — `FieldConfig` type + `MOBILE_CONFIG` + `DESKTOP_DEFAULT` (Phase 1); quality presets + `resolveQuality` added in Phase 2.
- `src/physics/generateFlasks.ts` (new) — pure layout: `mulberry32`, `generateFlasks(config, viewport)`, returns `FlaskConfig[]`.
- `src/physics/generateFlasks.test.ts` (new) — unit tests.
- `src/physics/constants.ts` (modify) — drop `DEPTH_SCALE`/`DEPTH_OPACITY`; add `LAYER_SCALE`.
- `src/physics/createFlaskBody.ts` (modify) — add `scale` param.
- `src/physics/createChainBodies.ts` (modify) — add `scale` param.
- `src/physics/createFlaskBody.test.ts`, `createChainBodies.test.ts` (new) — scale tests.
- `src/components/physics/FlaskChain.tsx` (modify) — `scale` + `isSkeleton` props; visual centered on body; delete `scaleOffsetY`.
- `src/components/physics/PhysicsScene.tsx` (modify) — consume `generateFlasks(config)`; pass `scale`/`isSkeleton`.

**Phase 2 — quality + detection + settings + loop**
- `src/physics/fieldConfig.ts` (modify) — `QUALITY_PRESETS`, `resolveQuality`, `applyFpsDowngrade`.
- `src/physics/fieldConfig.test.ts` (new) — `resolveQuality` + `applyFpsDowngrade` tests.
- `src/store/useAppStore.ts` (modify) — `quality` state (persisted).
- `src/components/settings/SettingsPanel.tsx` (modify) — quality selector.
- `src/hooks/useFrameLoop.ts` (new) + `src/physics/frameLoop.ts` (new) — subscriber registry loop.
- `src/physics/frameLoop.test.ts` (new) — registry/loop unit tests.
- `src/hooks/useAnimationSync.ts` (remove/replace) and `FlaskChain.tsx`, `PhysicsScene.tsx` (modify) — subscribe to the shared loop.

---

# PHASE 1 — Model + FieldConfig refactor

### Task 1: Add vitest test infrastructure

**Files:**
- Create: `web/vitest.config.ts`
- Modify: `web/package.json` (scripts + devDependency)
- Create: `web/src/physics/sanity.test.ts` (temporary)

- [ ] **Step 1: Install vitest**

Run (from `web/`): `npm install -D vitest@^2`
Expected: adds `vitest` to devDependencies.

- [ ] **Step 2: Create vitest config (node env, no CSS)**

Create `web/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

- [ ] **Step 3: Add test script**

In `web/package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a sanity test**

Create `web/src/physics/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("sanity", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Delete the sanity test and commit**

Run: `rm src/physics/sanity.test.ts`
```bash
git add web/package.json web/package-lock.json web/vitest.config.ts
git commit -m "test: add vitest runner to web"
```
> Note: `web/` is untracked; this is the first time these files are added. That's expected.

---

### Task 2: `FieldConfig` type + base configs + `LAYER_SCALE`

**Files:**
- Modify: `web/src/physics/constants.ts`
- Create: `web/src/physics/fieldConfig.ts`

- [ ] **Step 1: Update constants**

In `web/src/physics/constants.ts`, **keep** `DEPTH_SCALE`/`DEPTH_OPACITY` for now — `FlaskChain` still imports them; they're removed in Task 5 once `FlaskChain` stops using them. This keeps every commit building.

**Add** `LAYER_SCALE` (keep the existing `DEPTH_LAYERS`, `CAT_LAYER`, etc.):
```ts
// Per-tier visual+physics scale, front → back. Length defines the desktop tier
// count. Single source of truth for size at each depth.
export const LAYER_SCALE = [1.0, 0.82, 0.66, 0.5, 0.36] as const;
```
`CAT_LAYER` has only 3 entries but tiers are now 5; skeletons (back tiers) get **no physics body**, so `layerFilter` is only ever called for the 3 front (physics) tiers — but clamp defensively. Skeletons having no body means the old `layer === 2` "no mouse" branch is obsolete: every flask with a body is interactive. Replace `layerFilter`:
```ts
export function layerFilter(layer: number) {
  const idx = Math.min(layer, CAT_LAYER.length - 1);
  const cat = CAT_LAYER[idx];
  return { category: cat, mask: cat | CAT_MOUSE | CAT_WALL };
}
```
And widen `MOUSE_MASK` so the cursor repels all 3 physics tiers:
```ts
export const MOUSE_MASK = CAT_LAYER[0] | CAT_LAYER[1] | CAT_LAYER[2];
```

- [ ] **Step 2: Create FieldConfig + base configs**

Create `web/src/physics/fieldConfig.ts`:
```ts
import { LAYER_SCALE } from "./constants";

export interface FieldConfig {
  /** Total flasks to attempt to place. */
  flaskCount: number;
  /** Max simulated (physics) flasks; overflow becomes skeletons. */
  maxPhysicsFlasks: number;
  /** Scale per tier, front → back. Length === tier count. */
  layerScale: readonly number[];
  /** The back N tiers are skeletons (static, no physics, no icon). */
  skeletonBands: number;
  /** [min, max] chain segment count. */
  segmentRange: [number, number];
  /** Desktop spread vs mobile column. */
  layout: "field" | "column";
}

// Lean desktop default (Phase 1). Quality presets replace this in Phase 2.
export const DESKTOP_DEFAULT: FieldConfig = {
  flaskCount: 30,
  maxPhysicsFlasks: 18,
  layerScale: LAYER_SCALE,
  skeletonBands: 2,
  segmentRange: [3, 11],
  layout: "field",
};

// Mobile: tier 0 = interactive column; tiers 1..2 = background skeleton planes.
export const MOBILE_CONFIG: FieldConfig = {
  flaskCount: 8, // ~4 foreground + ~4 background skeletons
  maxPhysicsFlasks: 4,
  layerScale: [1.0, 0.5, 0.36],
  skeletonBands: 2,
  segmentRange: [4, 5],
  layout: "column",
};
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors (fix any remaining `DEPTH_SCALE`/`DEPTH_OPACITY` references — they're addressed in Tasks 5–6, so if tsc complains about `FlaskChain.tsx`/`PhysicsScene.tsx` here, that's expected and resolved later; this step only needs `constants.ts` + `fieldConfig.ts` to be internally valid).

- [ ] **Step 4: Commit**

```bash
git add web/src/physics/constants.ts web/src/physics/fieldConfig.ts
git commit -m "feat(physics): add FieldConfig + LAYER_SCALE (5 tiers)"
```

---

### Task 3: Pure `generateFlasks(config, viewport)` + tests

**Files:**
- Create: `web/src/physics/generateFlasks.ts`
- Create: `web/src/physics/generateFlasks.test.ts`

The output type:
```ts
export interface FlaskConfig {
  xPct: number;        // 0..1 horizontal anchor
  anchorY: number;     // world-space chain-top Y
  segments: number;
  color: string;
  scale: number;       // single source of truth for size
  isSkeleton: boolean; // static, no physics, no icon
  layer: number;       // tier index (paint order / collision plane)
  skillIcon?: string;
}
```

- [ ] **Step 1: Write failing tests**

Create `web/src/physics/generateFlasks.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateFlasks } from "./generateFlasks";
import type { FieldConfig } from "./fieldConfig";

const FIELD: FieldConfig = {
  flaskCount: 30, maxPhysicsFlasks: 18,
  layerScale: [1.0, 0.82, 0.66, 0.5, 0.36],
  skeletonBands: 2, segmentRange: [3, 11], layout: "field",
};
const skills = Array.from({ length: 22 }, (_, i) => `/skills/s${i}.svg`);
const vp = { width: 1440, height: 900 };

describe("generateFlasks (field)", () => {
  it("is deterministic for the same seed", () => {
    const a = generateFlasks(FIELD, vp, skills, 42);
    const b = generateFlasks(FIELD, vp, skills, 42);
    expect(a).toEqual(b);
  });

  it("uses layerScale for each flask's scale", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    for (const x of f) expect(x.scale).toBe(FIELD.layerScale[x.layer]);
  });

  it("marks the back skeletonBands tiers as skeletons", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    const firstSkelTier = FIELD.layerScale.length - FIELD.skeletonBands; // 3
    for (const x of f) {
      if (x.layer >= firstSkelTier) expect(x.isSkeleton).toBe(true);
    }
  });

  it("never gives skeletons an icon", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    for (const x of f) if (x.isSkeleton) expect(x.skillIcon).toBeUndefined();
  });

  it("caps physics flasks at maxPhysicsFlasks (overflow → skeleton)", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    expect(f.filter((x) => !x.isSkeleton).length).toBeLessThanOrEqual(FIELD.maxPhysicsFlasks);
  });

  it("assigns icons only up to the skill count", () => {
    const f = generateFlasks(FIELD, vp, skills, 42);
    expect(f.filter((x) => x.skillIcon).length).toBeLessThanOrEqual(skills.length);
  });
});

describe("generateFlasks (column / mobile)", () => {
  const COLUMN: FieldConfig = {
    flaskCount: 8, maxPhysicsFlasks: 4,
    layerScale: [1.0, 0.5, 0.36], skeletonBands: 2,
    segmentRange: [4, 5], layout: "column",
  };
  it("foreground (tier 0) is interactive, others are background skeletons", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 844 }, skills, 42);
    const fg = f.filter((x) => x.layer === 0);
    const bg = f.filter((x) => x.layer > 0);
    expect(fg.length).toBeGreaterThan(0);
    expect(fg.every((x) => !x.isSkeleton)).toBe(true);
    expect(bg.every((x) => x.isSkeleton)).toBe(true);
  });
  it("foreground flasks are centered horizontally (column)", () => {
    const f = generateFlasks(COLUMN, { width: 390, height: 844 }, skills, 42);
    for (const x of f.filter((x) => x.layer === 0)) {
      expect(Math.abs(x.xPct - 0.5)).toBeLessThan(0.15);
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- generateFlasks`
Expected: FAIL ("generateFlasks is not a function" / module not found).

- [ ] **Step 3: Implement `generateFlasks`**

Create `web/src/physics/generateFlasks.ts`:
```ts
import type { FieldConfig } from "./fieldConfig";
import { getSegmentHeight, FLASK_HITBOX_HEIGHT, MIN_SAME_LAYER_DISTANCE_PCT } from "./constants";

export interface FlaskConfig {
  xPct: number;
  anchorY: number;
  segments: number;
  color: string;
  scale: number;
  isSkeleton: boolean;
  layer: number;
  skillIcon?: string;
}

export const FLASK_COLORS = [
  "rgba(255, 86, 86, 0.7)", "rgba(86, 200, 255, 0.7)", "rgba(86, 255, 130, 0.7)",
  "rgba(255, 200, 60, 0.7)", "rgba(200, 86, 255, 0.7)", "rgba(255, 140, 60, 0.7)",
  "rgba(60, 255, 220, 0.7)", "rgba(255, 100, 180, 0.7)",
];

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sum of scaled segment heights for a chain of `segments` links at `scale`. */
function chainLength(segments: number, scale: number): number {
  let s = 0;
  for (let k = 0; k < segments; k++) s += getSegmentHeight(k) * scale;
  return s;
}

export function generateFlasks(
  config: FieldConfig,
  viewport: { width: number; height: number },
  skillPaths: string[],
  seed = 42,
): FlaskConfig[] {
  const rng = mulberry32(seed);
  const tierCount = config.layerScale.length;
  const firstSkelTier = tierCount - config.skeletonBands;
  const [minSeg, maxSeg] = config.segmentRange;

  // Shuffle skills for varied assignment (seeded).
  const skills = [...skillPaths];
  for (let i = skills.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [skills[i], skills[j]] = [skills[j], skills[i]];
  }
  let skillIdx = 0;
  let physicsCount = 0;
  const out: FlaskConfig[] = [];

  const makeFlask = (xPct: number, layer: number, anchorY: number): FlaskConfig => {
    const scale = config.layerScale[layer];
    const segments = minSeg + Math.floor(rng() * (maxSeg - minSeg + 1));
    const color = FLASK_COLORS[Math.floor(rng() * FLASK_COLORS.length)];
    const bandSkeleton = layer >= firstSkelTier;
    const overBudget = !bandSkeleton && physicsCount >= config.maxPhysicsFlasks;
    const isSkeleton = bandSkeleton || overBudget;
    if (!isSkeleton) physicsCount++;
    let skillIcon: string | undefined;
    if (!isSkeleton && skillIdx < skills.length) skillIcon = skills[skillIdx++];
    return { xPct, anchorY, segments, color, scale, isSkeleton, layer, skillIcon };
  };

  if (config.layout === "field") {
    // Generate raw flasks, sort by segment length (shorter → front), bucket
    // into tiers by equal thirds-style split, drop too-close same-tier flasks.
    const raw = Array.from({ length: config.flaskCount }, () => ({
      xPct: 0.03 + rng() * 0.94,
      segments: minSeg + Math.floor(rng() * (maxSeg - minSeg + 1)),
    }));
    raw.sort((a, b) => a.segments - b.segments);
    const perTier = Math.ceil(raw.length / tierCount);
    const placed: number[][] = Array.from({ length: tierCount }, () => []);
    for (let i = 0; i < raw.length; i++) {
      const layer = Math.min(Math.floor(i / perTier), tierCount - 1);
      const { xPct } = raw[i];
      if (placed[layer].some((x) => Math.abs(x - xPct) < MIN_SAME_LAYER_DISTANCE_PCT)) continue;
      placed[layer].push(xPct);
      out.push(makeFlask(xPct, layer, -80));
    }
    // Paint back tiers first (depth).
    out.sort((a, b) => b.layer - a.layer);
    return out;
  }

  // layout === "column": tier 0 = vertical interactive column; tiers >0 =
  // scattered background skeletons.
  const colJitter = [-0.05, 0.06, -0.04, 0.05];
  const bodyFrac = [0.32, 0.46, 0.58, 0.7];
  const foreground = Math.max(1, config.maxPhysicsFlasks);
  for (let i = 0; i < foreground; i++) {
    const xPct = 0.5 + (colJitter[i % colJitter.length] ?? 0);
    const segments = minSeg + (i % Math.max(1, maxSeg - minSeg + 1));
    const scale = config.layerScale[0];
    const anchorY =
      (bodyFrac[i % bodyFrac.length] ?? 0.5) * viewport.height -
      chainLength(segments, scale) - (FLASK_HITBOX_HEIGHT * scale) / 2;
    out.push(makeFlask(xPct, 0, anchorY));
  }
  // Background skeletons spread across tiers 1..tierCount-1.
  const bgCount = Math.max(0, config.flaskCount - foreground);
  for (let i = 0; i < bgCount; i++) {
    const layer = 1 + (i % Math.max(1, tierCount - 1));
    const xPct = 0.12 + rng() * 0.76;
    const segments = minSeg + Math.floor(rng() * (maxSeg - minSeg + 1));
    const scale = config.layerScale[layer] ?? config.layerScale[config.layerScale.length - 1];
    const anchorY = (0.2 + rng() * 0.6) * viewport.height - chainLength(segments, scale);
    out.push(makeFlask(xPct, layer, anchorY));
  }
  // Paint deeper (smaller) skeletons first; foreground last.
  out.sort((a, b) => b.layer - a.layer);
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- generateFlasks`
Expected: all PASS. If the budget/skeleton tests fail, re-check `firstSkelTier` and `overBudget` logic before changing tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/physics/generateFlasks.ts web/src/physics/generateFlasks.test.ts
git commit -m "feat(physics): pure generateFlasks with scale + isSkeleton (tested)"
```

---

### Task 4: Scale the physics bodies

**Files:**
- Modify: `web/src/physics/createFlaskBody.ts`
- Modify: `web/src/physics/createChainBodies.ts`
- Create: `web/src/physics/createFlaskBody.test.ts`
- Create: `web/src/physics/createChainBodies.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/physics/createChainBodies.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createChainBodies } from "./createChainBodies";
import { CHAIN_SEGMENT_WIDTH, getSegmentHeight } from "./constants";

describe("createChainBodies scale", () => {
  it("scales segment width and height by scale", () => {
    const full = createChainBodies(100, 0, 4, 1.0);
    const half = createChainBodies(100, 0, 4, 0.5);
    const wFull = full.segments[2].bounds.max.x - full.segments[2].bounds.min.x;
    const wHalf = half.segments[2].bounds.max.x - half.segments[2].bounds.min.x;
    expect(wHalf).toBeCloseTo(wFull * 0.5, 1);
    expect(half.segmentHeights[1]).toBeCloseTo(getSegmentHeight(1) * 0.5, 5);
    expect(full.segmentHeights[0]).toBeCloseTo(getSegmentHeight(0), 5);
    expect(CHAIN_SEGMENT_WIDTH).toBeGreaterThan(0);
  });
});
```

Create `web/src/physics/createFlaskBody.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import Matter from "matter-js";
import { createFlaskBody } from "./createFlaskBody";
import { FLASK_HITBOX_HEIGHT } from "./constants";

describe("createFlaskBody scale", () => {
  it("scales the trapezoid hitbox by scale", () => {
    const seg = Matter.Bodies.rectangle(0, 0, 10, 40);
    const full = createFlaskBody(seg, 40, 1.0);
    const half = createFlaskBody(seg, 40, 0.5);
    const hFull = full.body.bounds.max.y - full.body.bounds.min.y;
    const hHalf = half.body.bounds.max.y - half.body.bounds.min.y;
    expect(hHalf).toBeCloseTo(hFull * 0.5, 0);
    expect(FLASK_HITBOX_HEIGHT).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- createChainBodies createFlaskBody`
Expected: FAIL (signatures don't accept `scale`, or sizes don't scale).

- [ ] **Step 3: Add `scale` to `createChainBodies`**

In `web/src/physics/createChainBodies.ts`: change the signature to add `scale = 1` after `layer`/before defaults (drop the unused `layer` if present, or keep it; the body collision filter for chains is `CHAIN_FILTER` regardless). New signature:
```ts
export function createChainBodies(
  anchorX: number,
  anchorY: number,
  segmentCount: number = CHAIN_SEGMENT_COUNT,
  scale: number = 1,
): ChainResult {
```
Then inside: multiply width and height by `scale`:
```ts
const h = getSegmentHeight(i) * scale;
...
const segment = Matter.Bodies.rectangle(anchorX, y, CHAIN_SEGMENT_WIDTH * scale, h, { ... });
```
`segmentHeights.push(h)` now pushes the scaled height (constraint offsets already use `segmentHeights[i]/2`, so they scale automatically). Leave constraint stiffness/damping unchanged.

- [ ] **Step 4: Add `scale` to `createFlaskBody`**

In `web/src/physics/createFlaskBody.ts`: change signature to:
```ts
export function createFlaskBody(
  lastChainSegment: Matter.Body,
  lastSegmentHeight: number,
  scale: number = 1,
  noFlaskCollision: boolean = false,
  layer: number = 0,
): FlaskResult {
```
Use scaled dimensions:
```ts
const w = FLASK_HITBOX_WIDTH * scale;
const hgt = FLASK_HITBOX_HEIGHT * scale;
const body = Matter.Bodies.trapezoid(
  segPos.x,
  segPos.y + lastSegmentHeight / 2 + hgt / 2,
  w, hgt, 0.3,
  { /* unchanged options; use layerFilter(layer) / noFlaskCollision as before */ },
);
```
And the constraint `pointB: { x: 0, y: -hgt / 2 }`. Keep `pointA: { x: 0, y: lastSegmentHeight / 2 }`.

> Note the param order change (`scale` before `noFlaskCollision`, `layer` last). Callers are updated in Task 5.

- [ ] **Step 5: Run tests**

Run: `npm test -- createChainBodies createFlaskBody`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/physics/createFlaskBody.ts web/src/physics/createChainBodies.ts web/src/physics/createFlaskBody.test.ts web/src/physics/createChainBodies.test.ts
git commit -m "feat(physics): scale flask + chain bodies by per-flask scale (tested)"
```

---

### Task 5: `FlaskChain` — `isSkeleton` + scaled-body visual, delete `scaleOffsetY`

**Files:**
- Modify: `web/src/components/physics/FlaskChain.tsx`

No automated test (React + rAF + DOM; the in-session tab is hidden so motion can't be verified). Verification = `tsc` + `eslint` + (human) debug overlay alignment.

- [ ] **Step 1: Update props**

Add to `Props`: `scale?: number;` and `isSkeleton?: boolean;`. Default `scale = 1`, `isSkeleton = false`. Replace the internal `const scale = DEPTH_SCALE[layer];` and `const opacity = DEPTH_OPACITY[layer];` and `const isStatic = layer === 2;` with:
```ts
const isStatic = isSkeleton;
const opacity = 1;
```
(`scale` now comes from props.) Remove the `DEPTH_SCALE`/`DEPTH_OPACITY` imports from `FlaskChain.tsx`, then **delete** the now-unused `DEPTH_SCALE` and `DEPTH_OPACITY` exports from `constants.ts` (no other file imports them — verify with `grep -rn "DEPTH_SCALE\|DEPTH_OPACITY" src`).

- [ ] **Step 2: Pass scale to body creators**

In the body-creation effect, update the calls:
```ts
const chain = createChainBodies(ax, ay, segmentCount, scale);
const lastH = chain.segmentHeights[chain.segmentHeights.length - 1];
const flask = createFlaskBody(
  chain.segments[chain.segments.length - 1],
  lastH, scale, noFlaskCollision, layer,
);
```

- [ ] **Step 3: Delete `scaleOffsetY`, center visual on body**

In BOTH the static-positioning effect and `syncDom`, remove every `scaleOffsetY` line and the `- scaleOffsetY` term. The flask transform becomes (dynamic path):
```ts
const x = fb.position.x - FLASK_WIDTH / 2;
const y = fb.position.y - FLASK_HEIGHT / 2;
flaskEl.style.transform = `translate(${x}px, ${y}px) rotate(${angleDeg}deg) scale(${scale})`;
flaskEl.style.transformOrigin = `${FLASK_WIDTH / 2}px ${FLASK_HEIGHT / 2}px`;
```
Static path (skeleton): same but no rotation, positioned from accumulated **scaled** segment heights — change the static loop to advance `currentY += getSegmentHeight(i) * scale` and chain link transform to include `scaleX(${scale})` with the scaled height, and the flask transform as above (no `scaleOffsetY`).

- [ ] **Step 4: Static chain uses scaled heights**

In the static-positioning effect, the chain link height/positioning must use `getSegmentHeight(i) * scale` (so skeleton chains shrink too). Update the `h` and `currentY` accumulation and the `transformOrigin`/height accordingly.

- [ ] **Step 5: Verify types + lint**

Run: `npx tsc --noEmit && npx eslint src/components/physics/FlaskChain.tsx`
Expected: clean. (PhysicsScene may still error until Task 6 — that's fine; ensure `FlaskChain.tsx` itself is clean.)

- [ ] **Step 6: Commit**

```bash
git add web/src/components/physics/FlaskChain.tsx web/src/physics/constants.ts
git commit -m "feat(physics): FlaskChain uses scaled body + isSkeleton, drop scaleOffsetY"
```

---

### Task 6: `PhysicsScene` — consume `generateFlasks(config)`

**Files:**
- Modify: `web/src/components/physics/PhysicsScene.tsx`

- [ ] **Step 1: Remove the inline layout**

Delete the local `mulberry32`, `FlaskConfig`, `FLASK_COLORS`, `generateFlasks`, `FLASK_COUNT`, `MOBILE_FLASK_COUNT`, `MIN_SEGMENTS`, `MAX_SEGMENTS` from `PhysicsScene.tsx`. Import instead:
```ts
import { generateFlasks } from "@/physics/generateFlasks";
import { DESKTOP_DEFAULT, MOBILE_CONFIG } from "@/physics/fieldConfig";
import skills from "@/data/skills.json";
```

- [ ] **Step 2: Build the flask list from config**

Replace the `flasks` memo:
```ts
const flasks = useMemo(() => {
  if (dims.width === 0) return [];
  const config = isMobile ? MOBILE_CONFIG : DESKTOP_DEFAULT;
  const skillPaths = skills.map((s) => s.svgPath);
  return generateFlasks(config, { width: dims.width, height: dims.height }, skillPaths, 42);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dims.width > 0, isMobile, dims.height]);
```

- [ ] **Step 3: Pass scale + isSkeleton to FlaskChain**

In the `.map`, add props:
```tsx
<FlaskChain
  key={`flask-${i}`}
  engine={engine}
  anchorX={cfg.xPct * dims.width}
  anchorY={cfg.anchorY}
  instanceId={`flask-${i}`}
  color={cfg.color}
  segmentCount={cfg.segments}
  layer={cfg.layer}
  scale={cfg.scale}
  isSkeleton={cfg.isSkeleton}
  skillIcon={cfg.skillIcon}
  active={active}
  noFlaskCollision={isMobile}
/>
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all clean; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/physics/PhysicsScene.tsx
git commit -m "feat(physics): drive PhysicsScene from generateFlasks + FieldConfig"
```

**Phase 1 done:** debug overlay hitboxes should now wrap the glass at every depth; back two tiers are static skeletons; lean physics budget.

---

# PHASE 2 — Quality + detection + settings + loop consolidation

### Task 7: Quality presets + `resolveQuality` + `applyFpsDowngrade` (tested)

**Files:**
- Modify: `web/src/physics/fieldConfig.ts`
- Create: `web/src/physics/fieldConfig.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/physics/fieldConfig.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveQuality, applyFpsDowngrade, QUALITY_PRESETS } from "./fieldConfig";

describe("resolveQuality", () => {
  it("reduced-motion forces low", () => {
    expect(resolveQuality({ cores: 16, memory: 16, prefersReducedMotion: true, isMobile: false })).toBe("low");
  });
  it("few cores → low", () => {
    expect(resolveQuality({ cores: 2, memory: 8, prefersReducedMotion: false, isMobile: false })).toBe("low");
  });
  it("mid cores → medium", () => {
    expect(resolveQuality({ cores: 6, memory: 8, prefersReducedMotion: false, isMobile: false })).toBe("medium");
  });
  it("many cores + memory → high", () => {
    expect(resolveQuality({ cores: 12, memory: 16, prefersReducedMotion: false, isMobile: false })).toBe("high");
  });
  it("low memory caps to medium even with many cores", () => {
    expect(resolveQuality({ cores: 12, memory: 3, prefersReducedMotion: false, isMobile: false })).not.toBe("high");
  });
});

describe("applyFpsDowngrade", () => {
  it("drops one level when fps below threshold", () => {
    expect(applyFpsDowngrade("high", 30)).toBe("medium");
    expect(applyFpsDowngrade("medium", 30)).toBe("low");
    expect(applyFpsDowngrade("low", 30)).toBe("low");
  });
  it("keeps level when fps healthy", () => {
    expect(applyFpsDowngrade("high", 58)).toBe("high");
  });
});

describe("QUALITY_PRESETS", () => {
  it("has low/medium/high desktop configs", () => {
    expect(QUALITY_PRESETS.low.maxPhysicsFlasks).toBeLessThan(QUALITY_PRESETS.medium.maxPhysicsFlasks);
    expect(QUALITY_PRESETS.high.maxPhysicsFlasks).toBeGreaterThan(QUALITY_PRESETS.medium.maxPhysicsFlasks);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- fieldConfig`
Expected: FAIL (exports missing).

- [ ] **Step 3: Implement presets + resolution**

Append to `web/src/physics/fieldConfig.ts`:
```ts
export type Quality = "low" | "medium" | "high";

export const QUALITY_PRESETS: Record<Quality, FieldConfig> = {
  low: { flaskCount: 26, maxPhysicsFlasks: 8, layerScale: LAYER_SCALE, skeletonBands: 3, segmentRange: [3, 7], layout: "field" },
  medium: { ...DESKTOP_DEFAULT, maxPhysicsFlasks: 18, skeletonBands: 2 },
  high: { flaskCount: 44, maxPhysicsFlasks: 26, layerScale: LAYER_SCALE, skeletonBands: 2, segmentRange: [3, 11], layout: "field" },
};
// Note: high's flaskCount (44) is sized so the 3 physics tiers hold >22 slots,
// so a few empty-but-interactive flasks appear once the 22 skills run out. Tune
// in the browser.

export interface DeviceSignals {
  cores: number;
  memory: number; // GB; use 8 when unknown
  prefersReducedMotion: boolean;
  isMobile: boolean;
}

export function resolveQuality(s: DeviceSignals): Quality {
  if (s.prefersReducedMotion) return "low";
  let q: Quality = s.cores < 4 ? "low" : s.cores <= 8 ? "medium" : "high";
  if (q === "high" && s.memory < 4) q = "medium"; // low RAM caps it
  return q;
}

const ORDER: Quality[] = ["low", "medium", "high"];
export function applyFpsDowngrade(q: Quality, fps: number, threshold = 45): Quality {
  if (fps >= threshold) return q;
  const i = ORDER.indexOf(q);
  return ORDER[Math.max(0, i - 1)];
}
```
(`LAYER_SCALE` is already imported at the top of the file.)

- [ ] **Step 4: Run tests**

Run: `npm test -- fieldConfig`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/physics/fieldConfig.ts web/src/physics/fieldConfig.test.ts
git commit -m "feat(physics): quality presets + resolveQuality + fps downgrade (tested)"
```

---

### Task 8: `quality` in the store

**Files:**
- Modify: `web/src/store/useAppStore.ts`

- [ ] **Step 1: Add state**

In `AppState`, add:
```ts
quality: "auto" | "low" | "medium" | "high";
setQuality: (q: "auto" | "low" | "medium" | "high") => void;
```
In the store body: `quality: "auto", setQuality: (quality) => set({ quality }),`.
In `partialize`, add `quality: state.quality,`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add web/src/store/useAppStore.ts
git commit -m "feat(store): persist graphics quality setting"
```

---

### Task 9: Quality selector in `SettingsPanel`

**Files:**
- Modify: `web/src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Read the file** to match its existing control patterns (button groups / selects), then add a "Graphics quality" control bound to `useAppStore`'s `quality`/`setQuality`, with options `Auto / Low / Medium / High`. Follow the file's existing styling primitives — do not invent a new design system.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/settings/SettingsPanel.tsx
git commit -m "feat(settings): graphics quality selector"
```

---

### Task 10: Wire quality → FieldConfig in `PhysicsScene`

**Files:**
- Modify: `web/src/components/physics/PhysicsScene.tsx`

- [ ] **Step 1: Resolve quality + signals**

Read `quality` from the store. Compute `DeviceSignals` from `navigator.hardwareConcurrency`, `navigator.deviceMemory` (fallback 8), `matchMedia("(prefers-reduced-motion: reduce)")`, and `isMobile`. When `quality === "auto"`, use `resolveQuality(signals)`; else use the explicit level. Pick the config:
```ts
const resolved = quality === "auto" ? resolveQuality(signals) : quality;
const config = isMobile ? MOBILE_CONFIG : QUALITY_PRESETS[resolved];
```
Guard `navigator`/`window` access for SSR (only read inside effects or after mount; `dims.width === 0` already gates first render). Add `resolved`/`quality` to the `flasks` memo deps.

- [ ] **Step 2: (Optional FPS downgrade) skip wiring the live probe here** — `applyFpsDowngrade` is unit-tested and available; wiring the live RAF probe into the loop is deferred to Task 11 where the consolidated loop exists. Leave a `// TODO(frameLoop): feed measured fps through applyFpsDowngrade` comment at the call site.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/physics/PhysicsScene.tsx
git commit -m "feat(physics): select FieldConfig from quality + device signals"
```

---

### Task 11: Consolidate the per-flask RAF loops into one frame loop

**Files:**
- Create: `web/src/physics/frameLoop.ts`
- Create: `web/src/physics/frameLoop.test.ts`
- Create: `web/src/hooks/useFrameLoop.ts`
- Modify: `web/src/components/physics/FlaskChain.tsx`, `web/src/components/physics/PhysicsScene.tsx`
- Remove/replace: `web/src/hooks/useAnimationSync.ts`

- [ ] **Step 1: Write failing test for the pure loop core**

Create `web/src/physics/frameLoop.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { createFrameLoop } from "./frameLoop";

describe("frameLoop", () => {
  it("calls subscribers after stepping the engine", () => {
    const update = vi.fn();
    const sub = vi.fn();
    let cb: ((t: number) => void) | null = null;
    const loop = createFrameLoop({
      update,
      schedule: (fn) => { cb = fn; return 1; },
      cancel: () => {},
    });
    loop.subscribe("a", sub);
    loop.start();
    cb!(0);     // first frame: baseline only
    cb!(16.7);  // ~one fixed step
    expect(update).toHaveBeenCalled();
    expect(sub).toHaveBeenCalled();
  });

  it("never passes a delta above 16.667ms to update", () => {
    const deltas: number[] = [];
    let cb: ((t: number) => void) | null = null;
    const loop = createFrameLoop({
      update: (d) => deltas.push(d),
      schedule: (fn) => { cb = fn; return 1; },
      cancel: () => {},
    });
    loop.start();
    cb!(0); cb!(200); // huge gap
    expect(Math.max(...deltas)).toBeLessThanOrEqual(1000 / 60 + 1e-9);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- frameLoop`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the pure loop** (fixed-timestep accumulator + subscriber registry; ports the POC's `flaskFieldLoop.ts` idea, keeping the already-shipped fixed-timestep math)

Create `web/src/physics/frameLoop.ts`:
```ts
export type SyncFn = () => void;
export interface FrameLoopDeps {
  update: (deltaMs: number) => void;
  schedule: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
}
const FIXED = 1000 / 60;
const MAX_FRAME = 100;
const MAX_STEPS = 5;

export function createFrameLoop(deps: FrameLoopDeps) {
  const subs = new Map<string, SyncFn>();
  let raf = 0, last = 0, acc = 0, running = false;
  const tick = (t: number) => {
    if (last) {
      acc += Math.min(t - last, MAX_FRAME);
      let steps = 0;
      while (acc >= FIXED && steps < MAX_STEPS) { deps.update(FIXED); acc -= FIXED; steps++; }
      if (steps === MAX_STEPS) acc = 0;
      if (steps > 0) for (const fn of subs.values()) fn();
    }
    last = t;
    raf = deps.schedule(tick);
  };
  return {
    subscribe(id: string, fn: SyncFn) { subs.set(id, fn); return () => subs.delete(id); },
    start() { if (running) return; running = true; last = 0; acc = 0; raf = deps.schedule(tick); },
    stop() { running = false; deps.cancel(raf); },
  };
}
export type FrameLoop = ReturnType<typeof createFrameLoop>;
```

- [ ] **Step 4: Run tests**

Run: `npm test -- frameLoop`
Expected: PASS.

- [ ] **Step 5: React wiring**

Create `web/src/hooks/useFrameLoop.ts`: a hook that builds a stable `FrameLoop` (via `useState` lazy init) bound to `Matter.Engine.update(engine, dt)` + `requestAnimationFrame`, and starts/stops it based on an `active` flag. Provide the loop to children via a React context (`FrameLoopContext`).
- In `PhysicsScene.tsx`: replace `useAnimationSync(engine, active)` with `const loop = useFrameLoop(engine, active)` and wrap the flask list in `<FrameLoopContext.Provider value={loop}>`.
- In `FlaskChain.tsx`: remove the per-flask `requestAnimationFrame(syncDom)` loop; instead `useContext(FrameLoopContext)` and `loop.subscribe(instanceId, syncDom)` in an effect (returning the unsubscribe), for physics flasks only. `syncDom` keeps its sleeping-skip guard but no longer reschedules itself.
- Delete `web/src/hooks/useAnimationSync.ts` (its fixed-timestep math now lives in `frameLoop.ts`).

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add web/src/physics/frameLoop.ts web/src/physics/frameLoop.test.ts web/src/hooks/useFrameLoop.ts web/src/components/physics/FlaskChain.tsx web/src/components/physics/PhysicsScene.tsx
git rm web/src/hooks/useAnimationSync.ts
git commit -m "perf: single frame loop drives engine + all flask DOM sync"
```

---

## Final verification (after all tasks)

- [ ] `npm test` — all unit suites pass.
- [ ] `npx tsc --noEmit && npm run lint && npm run build` — clean.
- [ ] Human/browser check (in-session tab is hidden — rAF/RO paused — so the human verifies): debug overlay hitboxes wrap the glass at every tier; depth reads well; quality selector changes density; reduced-motion → low; mobile shows column + background skeletons; the rack feels smooth (the original stutter complaint).
