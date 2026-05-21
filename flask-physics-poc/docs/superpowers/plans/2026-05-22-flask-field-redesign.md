# Flask Field Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-count, percentage-positioned flask field with a data-driven, constant-density, depth-banded field that runs on a single render loop and goes to zero CPU when idle, plus a precise contact-friction mouse interaction that shakes flasks on hit.

**Architecture:** Pure layout logic (count, seeding, band assignment, placement) is extracted into `src/layout/` and unit-tested. The React/Matter.js integration (PhysicsScene, FlaskChain, hooks) consumes that logic. A single engine+sync loop with a quiescence guard replaces the per-flask RAF loops. A sensor cursor body drives a collision-event shake.

**Tech Stack:** React 19 + TypeScript, Vite 7, Matter.js 0.20, Vitest (added in Phase 0).

**Source spec:** `docs/superpowers/specs/2026-05-22-flask-field-redesign-design.md`

**Verification philosophy:** TDD (Vitest, node env) for the pure layout modules — that's where the algorithmic complexity lives. Physics/DOM/mouse changes are verified by `tsc -b` (typecheck), `npm run lint`, `npm run build`, and manual dev-server checks using the existing `DebugPanel`. The spec explicitly designates this a visual POC. The in-session browser cannot shrink below desktop widths, so the mobile path is verified by logic + flagged for on-device testing.

---

## File Structure

**New files:**
- `src/types/flask.ts` — shared types: `SkillEntry`, `FlaskConfig`, `LayoutConfig`.
- `src/layout/rng.ts` — `mulberry32`, `getSessionSeed` (sessionStorage-backed).
- `src/layout/generateFlaskField.ts` — pure `generateFlaskField(...)` → `FlaskConfig[]` (desktop depth-bands + mobile rows).
- `src/layout/rng.test.ts`, `src/layout/generateFlaskField.test.ts` — Vitest unit tests.
- `src/physics/cursorBody.ts` — create the sensor cursor body.
- `src/hooks/useFlaskFieldLoop.ts` — single engine-update + DOM-sync loop with quiescence guard + a flask-sync registry.
- `vitest.config.ts` — test config.

**Modified files:**
- `src/data/skills.json` — add `priority` (+ optional `color`) to each entry.
- `src/physics/constants.ts` — add layout + mouse + shake + friction constants; lower `MOUSE_BODY_RADIUS`.
- `src/physics/createFlaskBody.ts` — add contact `friction`, tune `sleepThreshold`.
- `src/components/PhysicsScene.tsx` — use `generateFlaskField`; provide the sync registry; use `useFlaskFieldLoop`; wire wake events; add friction to walls; pass `isSkeleton`.
- `src/components/FlaskChain.tsx` — remove the per-flask RAF; register/unregister a sync fn; use `isSkeleton` instead of `layer === 2`.
- `src/hooks/useMousePhysics.ts` — add sensor cursor body + `collisionStart` shake + mousemove-wake; keep drag; mobile = drag only.
- `src/components/DebugPanel.tsx` — show "SUSPENDED" when engine ticks/s is 0.
- `src/hooks/useAnimationSync.ts` — **removed** (its job moves into `useFlaskFieldLoop`); delete its import/usage from PhysicsScene.
- `package.json` — add `vitest` devDep + `"test"` script.

---

## Phase 0 — Test infrastructure

### Task 0.1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `cd flask-physics-poc && npm install -D vitest`
Expected: vitest added to devDependencies, no errors.

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Smoke test**

Create `src/layout/rng.test.ts` temporarily with:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => expect(1 + 1).toBe(2));
});
```
Run: `npm test`
Expected: 1 passing test. (The real rng tests in Task 2.1 replace this file's contents.)

- [ ] **Step 5: Commit**

```bash
git add flask-physics-poc/package.json flask-physics-poc/package-lock.json flask-physics-poc/vitest.config.ts flask-physics-poc/src/layout/rng.test.ts
git commit -m "test: add Vitest infrastructure"
```

---

## Phase 1 — Data model, types, constants

### Task 1.1: Shared types

**Files:**
- Create: `src/types/flask.ts`

- [ ] **Step 1: Define types**

```ts
export interface SkillEntry {
  id: string;
  name: string;
  svgPath: string;
  color?: string;     // optional liquid color; falls back to palette
  priority?: number;  // higher = more prominent (front band + higher hang)
}

export interface LayoutConfig {
  columnCount: number;       // total depth bands
  skeletonBands: number;     // how many back bands are non-physics
  flaskSpacingX: number;     // px: density knob + min horizontal spacing
  minFlasks: number;
  maxFlasks: number;
  maxPhysicsFlasks: number;  // body budget for dynamic flasks
}

export interface FlaskConfig {
  xPct: number;        // 0..1 horizontal fraction (anchorX = xPct * width)
  anchorY: number;     // absolute px (top-anchored desktop; row offset mobile)
  segments: number;
  color: string;
  layer: number;       // depth band index (0 = front)
  skillIcon?: string;
  isSkeleton: boolean; // true => no physics, no interaction, positioned once
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc -b`
Expected: no errors.
```bash
git add flask-physics-poc/src/types/flask.ts
git commit -m "feat: add shared flask types"
```

### Task 1.2: Enrich skills.json with priority

**Files:**
- Modify: `src/data/skills.json`

- [ ] **Step 1: Add `priority` to every entry**

Replace the file with (priorities are an editable starting point):
```json
[
  { "id": "python", "name": "Python", "svgPath": "/skills/python.svg", "priority": 10 },
  { "id": "javascript", "name": "JavaScript", "svgPath": "/skills/javascript.svg", "priority": 9 },
  { "id": "nodejs", "name": "Node.js", "svgPath": "/skills/nodejs.svg", "priority": 8 },
  { "id": "java", "name": "Java", "svgPath": "/skills/java.svg", "priority": 8 },
  { "id": "git", "name": "Git", "svgPath": "/skills/git.svg", "priority": 7 },
  { "id": "cplusplus", "name": "C++", "svgPath": "/skills/cplusplus.svg", "priority": 7 },
  { "id": "csharp", "name": "C#", "svgPath": "/skills/csharp.svg", "priority": 7 },
  { "id": "c", "name": "C", "svgPath": "/skills/c.svg", "priority": 6 },
  { "id": "html5", "name": "HTML5", "svgPath": "/skills/html5.svg", "priority": 6 },
  { "id": "css3", "name": "CSS3", "svgPath": "/skills/css3.svg", "priority": 5 },
  { "id": "vscode", "name": "VS Code", "svgPath": "/skills/vscode.svg", "priority": 5 },
  { "id": "github", "name": "GitHub", "svgPath": "/skills/github.svg", "priority": 5 },
  { "id": "linux-garuda", "name": "Garuda Linux", "svgPath": "/skills/linux-garuda.svg", "priority": 5 },
  { "id": "linux-kali", "name": "Kali Linux", "svgPath": "/skills/linux-kali-cursed.svg", "priority": 5 },
  { "id": "sass", "name": "Sass", "svgPath": "/skills/sass.svg", "priority": 4 },
  { "id": "ubuntu", "name": "Ubuntu", "svgPath": "/skills/ubuntu.svg", "priority": 4 },
  { "id": "jetbrains", "name": "JetBrains", "svgPath": "/skills/jetbrains.svg", "priority": 4 },
  { "id": "windows11", "name": "Windows 11", "svgPath": "/skills/windows11.svg", "priority": 3 },
  { "id": "raspberrypi", "name": "Raspberry Pi", "svgPath": "/skills/raspberrypi.svg", "priority": 3 },
  { "id": "visual-studio", "name": "Visual Studio", "svgPath": "/skills/visual-studio.svg", "priority": 3 },
  { "id": "windows10", "name": "Windows 10", "svgPath": "/skills/windows10.svg", "priority": 2 },
  { "id": "brave", "name": "Brave", "svgPath": "/skills/brave.svg", "priority": 2 }
]
```

- [ ] **Step 2: Commit**

```bash
git add flask-physics-poc/src/data/skills.json
git commit -m "feat: add priority to skills.json"
```

### Task 1.3: Layout, mouse, shake, friction constants

**Files:**
- Modify: `src/physics/constants.ts`

- [ ] **Step 1: Add constants**

Append to `constants.ts`:
```ts
// --- Layout (depth bands + density) ---
export const COLUMN_COUNT = 3;          // total depth bands
export const SKELETON_BANDS = 1;        // back bands with no physics
export const FLASK_SPACING_X = 150;     // px: density knob + min horizontal gap
export const MIN_FLASKS = 8;
export const MAX_FLASKS = 70;
export const MAX_PHYSICS_FLASKS = 36;   // body budget for dynamic flasks

export const MIN_FLASK_SEGMENTS = 3;
export const MAX_FLASK_SEGMENTS = 14;

// --- Mouse / shake / friction ---
export const FLASK_FRICTION = 0.4;      // contact friction (was 0: pure frictionAir)
export const SHAKE_IMPULSE = 0.9;       // horizontal velocity injected on hit (px/step)
export const SHAKE_COOLDOWN_MS = 450;   // per-flask re-trigger lockout
export const ENGINE_WAKE_MS = 600;      // how long mousemove keeps the engine live
```

- [ ] **Step 2: Lower the mouse radius**

Change `export const MOUSE_BODY_RADIUS = 15;` → `export const MOUSE_BODY_RADIUS = 7;`

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc -b`
Expected: no errors (constants unused yet is fine — they're `export`ed).
```bash
git add flask-physics-poc/src/physics/constants.ts
git commit -m "feat: add layout/mouse/friction constants; shrink mouse radius"
```

---

## Phase 2 — Pure layout logic (TDD)

### Task 2.1: Seeded RNG + session seed

**Files:**
- Create: `src/layout/rng.ts`
- Test: `src/layout/rng.test.ts` (replaces the smoke test)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mulberry32, getSessionSeed } from "./rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("returns values in [0,1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("getSessionSeed", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    // @ts-expect-error minimal stub
    globalThis.sessionStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      key: () => null, length: 0,
    };
  });
  it("returns a stable integer within a session", () => {
    const first = getSessionSeed();
    const second = getSessionSeed();
    expect(first).toBe(second);
    expect(Number.isInteger(first)).toBe(true);
  });
  it("falls back to a fixed seed when sessionStorage throws", () => {
    // @ts-expect-error force failure
    globalThis.sessionStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    expect(Number.isInteger(getSessionSeed())).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test`
Expected: FAIL (`./rng` has no exports yet).

- [ ] **Step 3: Implement**

```ts
const SEED_KEY = "flask-field-seed";
const FALLBACK_SEED = 42;

export function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSessionSeed(): number {
  try {
    const existing = sessionStorage.getItem(SEED_KEY);
    if (existing !== null) return Number(existing);
    const seed = Math.floor(Math.random() * 0xffffffff);
    sessionStorage.setItem(SEED_KEY, String(seed));
    return seed;
  } catch {
    return FALLBACK_SEED;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test`
Expected: all rng tests pass.

- [ ] **Step 5: Commit**

```bash
git add flask-physics-poc/src/layout/rng.ts flask-physics-poc/src/layout/rng.test.ts
git commit -m "feat: seeded RNG + per-session seed (TDD)"
```

### Task 2.2: `generateFlaskField` — desktop depth bands

**Files:**
- Create: `src/layout/generateFlaskField.ts`
- Test: `src/layout/generateFlaskField.test.ts`

Signature:
```ts
generateFlaskField(args: {
  width: number;
  height: number;
  isMobile: boolean;
  skills: SkillEntry[];
  seed: number;
  config: LayoutConfig;
}): FlaskConfig[]
```

- [ ] **Step 1: Write failing tests (desktop)**

```ts
import { describe, it, expect } from "vitest";
import { generateFlaskField } from "./generateFlaskField";
import type { SkillEntry, LayoutConfig } from "../types/flask";

const config: LayoutConfig = {
  columnCount: 3, skeletonBands: 1, flaskSpacingX: 150,
  minFlasks: 8, maxFlasks: 70, maxPhysicsFlasks: 36,
};
const skills: SkillEntry[] = Array.from({ length: 22 }, (_, i) => ({
  id: `s${i}`, name: `S${i}`, svgPath: `/skills/s${i}.svg`, priority: 22 - i,
}));
const base = { height: 800, isMobile: false, skills, seed: 1, config };

describe("generateFlaskField (desktop)", () => {
  it("produces more flasks on wider screens (constant density)", () => {
    const narrow = generateFlaskField({ ...base, width: 600 }).length;
    const wide = generateFlaskField({ ...base, width: 2400 }).length;
    expect(wide).toBeGreaterThan(narrow);
  });

  it("is deterministic for a fixed seed + size", () => {
    const a = generateFlaskField({ ...base, width: 1280 });
    const b = generateFlaskField({ ...base, width: 1280 });
    expect(a).toEqual(b);
  });

  it("clamps to maxFlasks on ultrawide", () => {
    const n = generateFlaskField({ ...base, width: 100000 }).length;
    expect(n).toBeLessThanOrEqual(config.maxFlasks);
  });

  it("never exceeds the physics body budget", () => {
    const f = generateFlaskField({ ...base, width: 100000 });
    expect(f.filter((x) => !x.isSkeleton).length).toBeLessThanOrEqual(config.maxPhysicsFlasks);
  });

  it("marks back bands as skeletons", () => {
    const f = generateFlaskField({ ...base, width: 1280 });
    // band index >= columnCount - skeletonBands (i.e. layer 2) => skeleton
    expect(f.filter((x) => x.layer >= config.columnCount - config.skeletonBands).every((x) => x.isSkeleton)).toBe(true);
  });

  it("fills overflow slots with plain (icon-less) flasks, each skill once", () => {
    const f = generateFlaskField({ ...base, width: 2400 });
    const icons = f.filter((x) => x.skillIcon).map((x) => x.skillIcon);
    expect(new Set(icons).size).toBe(icons.length); // no duplicate icons
    expect(f.some((x) => !x.skillIcon)).toBe(true);  // some plain flasks exist
  });

  it("gives highest-priority skills to the front band and a higher hang", () => {
    const f = generateFlaskField({ ...base, width: 1280 });
    const front = f.filter((x) => x.layer === 0 && x.skillIcon);
    const back = f.filter((x) => x.layer === 1 && x.skillIcon);
    // front-band iconed flasks hang higher on average (fewer segments => shorter chain)
    const avg = (xs: typeof f) => xs.reduce((s, x) => s + x.segments, 0) / Math.max(1, xs.length);
    expect(avg(front)).toBeLessThanOrEqual(avg(back));
  });

  it("omits lowest-priority skills when there are fewer slots than skills", () => {
    const f = generateFlaskField({ ...base, width: 320 }); // tiny -> few slots
    const shownIds = new Set(f.map((x) => x.skillIcon));
    expect(f.length).toBeLessThan(skills.length);
    // the highest priority skill (s0, priority 22) must be present
    expect([...shownIds].some((s) => s?.includes("s0."))).toBe(true);
  });

  it("respects pixel spacing within a band (no two closer than spacing)", () => {
    const width = 1280;
    const f = generateFlaskField({ ...base, width });
    for (let layer = 0; layer < config.columnCount; layer++) {
      const xs = f.filter((x) => x.layer === layer).map((x) => x.xPct * width).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(config.flaskSpacingX - 1);
      }
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test`
Expected: FAIL (no `generateFlaskField`).

- [ ] **Step 3: Implement (desktop branch first)**

```ts
import type { FlaskConfig, LayoutConfig, SkillEntry } from "../types/flask";
import { mulberry32 } from "./rng";
import {
  MIN_FLASK_SEGMENTS,
  MAX_FLASK_SEGMENTS,
} from "../physics/constants";

const PALETTE = [
  "rgba(255, 86, 86, 0.7)", "rgba(86, 200, 255, 0.7)", "rgba(86, 255, 130, 0.7)",
  "rgba(255, 200, 60, 0.7)", "rgba(200, 86, 255, 0.7)", "rgba(255, 140, 60, 0.7)",
  "rgba(60, 255, 220, 0.7)", "rgba(255, 100, 180, 0.7)",
];

interface Args {
  width: number; height: number; isMobile: boolean;
  skills: SkillEntry[]; seed: number; config: LayoutConfig;
}

// Map a 0..1 "rank" (0 = highest priority) to a segment count.
// Higher priority => fewer segments => shorter chain => hangs higher.
function segmentsForRank(rank: number, rng: () => number): number {
  const span = MAX_FLASK_SEGMENTS - MIN_FLASK_SEGMENTS;
  const jitter = Math.floor(rng() * 3) - 1; // ±1
  return Math.max(
    MIN_FLASK_SEGMENTS,
    Math.min(MAX_FLASK_SEGMENTS, MIN_FLASK_SEGMENTS + Math.round(rank * span) + jitter)
  );
}

export function generateFlaskField(args: Args): FlaskConfig[] {
  const { width, height, isMobile, skills, seed, config } = args;
  if (isMobile) return generateMobileField(args);

  const rng = mulberry32(seed);
  const { columnCount, skeletonBands, flaskSpacingX, minFlasks, maxFlasks, maxPhysicsFlasks } = config;

  // 1. Width-driven count.
  const perBand = Math.max(1, Math.floor(width / flaskSpacingX));
  const targetCount = Math.max(minFlasks, Math.min(maxFlasks, columnCount * perBand));

  // 2. Sorted skills (priority desc). Missing priority => mid (5).
  const sorted = [...skills].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

  // 3. Build slots band-by-band (front first), assign skills, then plain flasks.
  const flasks: FlaskConfig[] = [];
  const firstSkeletonBand = columnCount - skeletonBands;
  let skillIdx = 0;
  let physicsCount = 0;

  for (let layer = 0; layer < columnCount; layer++) {
    const bandSlots = layer === 0
      ? targetCount - perBand * (columnCount - 1) // remainder to front
      : perBand;
    const placedX: number[] = [];

    for (let s = 0; s < bandSlots; s++) {
      // pixel-spaced rejection sampling within the band
      let x = -1;
      for (let attempt = 0; attempt < 60; attempt++) {
        const cand = flaskSpacingX / 2 + rng() * Math.max(1, width - flaskSpacingX);
        if (placedX.every((p) => Math.abs(p - cand) >= flaskSpacingX)) { x = cand; break; }
      }
      if (x < 0) continue; // band is full; stop crowding it
      placedX.push(x);

      const bandIsSkeleton = layer >= firstSkeletonBand;
      const overBudget = !bandIsSkeleton && physicsCount >= maxPhysicsFlasks;
      const isSkeleton = bandIsSkeleton || overBudget;
      if (!isSkeleton) physicsCount++;

      // assign a skill (icon) only to non-skeleton slots, in priority order
      let skillIcon: string | undefined;
      let color: string | undefined;
      let rank = rng(); // default rank for plain flasks
      if (!isSkeleton && skillIdx < sorted.length) {
        const skill = sorted[skillIdx];
        skillIcon = skill.svgPath;
        color = skill.color;
        rank = sorted.length > 1 ? skillIdx / (sorted.length - 1) : 0;
        skillIdx++;
      }

      flasks.push({
        xPct: x / width,
        anchorY: -80,
        segments: segmentsForRank(rank, rng),
        color: color ?? PALETTE[Math.floor(rng() * PALETTE.length)],
        layer,
        skillIcon,
        isSkeleton,
      });
    }
  }

  // 4. Render order: back to front.
  flasks.sort((a, b) => b.layer - a.layer);
  return flasks;
}

function generateMobileField(_args: Args): FlaskConfig[] {
  return []; // implemented in Task 2.3
}
```

> Note: `height` is intentionally unused in the desktop branch (count is width-driven). It is consumed by the mobile branch. Keep the param.

- [ ] **Step 4: Run — expect PASS (desktop tests)**

Run: `npm test`
Expected: all desktop tests pass. If the spacing test fails, confirm `flaskSpacingX` rejection logic uses `>= flaskSpacingX`.

- [ ] **Step 5: Commit**

```bash
git add flask-physics-poc/src/layout/generateFlaskField.ts flask-physics-poc/src/layout/generateFlaskField.test.ts
git commit -m "feat: generateFlaskField desktop depth-band layout (TDD)"
```

### Task 2.3: `generateFlaskField` — mobile rows

**Files:**
- Modify: `src/layout/generateFlaskField.ts`
- Modify: `src/layout/generateFlaskField.test.ts`

- [ ] **Step 1: Add failing mobile tests**

```ts
describe("generateFlaskField (mobile)", () => {
  const m = { width: 390, height: 844, isMobile: true, skills, seed: 1, config };
  it("distributes anchors down the height in rows (varied anchorY)", () => {
    const f = generateFlaskField(m);
    const ys = new Set(f.map((x) => x.anchorY));
    expect(ys.size).toBeGreaterThan(1); // not all anchored at the top
  });
  it("is deterministic", () => {
    expect(generateFlaskField(m)).toEqual(generateFlaskField(m));
  });
  it("produces a non-empty, reasonably small field", () => {
    const n = generateFlaskField(m).length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(config.maxFlasks);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`generateMobileField` returns `[]`).

Run: `npm test`

- [ ] **Step 3: Implement mobile rows**

Replace `generateMobileField`:
```ts
function generateMobileField(args: Args): FlaskConfig[] {
  const { width, height, skills, seed, config } = args;
  const rng = mulberry32(seed);
  const sorted = [...skills].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

  const numRows = 3;
  const perRow = Math.max(1, Math.floor(width / config.flaskSpacingX));
  const rowHeight = height / numRows;
  const flasks: FlaskConfig[] = [];
  let skillIdx = 0;

  for (let row = 0; row < numRows; row++) {
    const layer = row; // top row = front
    const isSkeleton = layer >= config.columnCount - config.skeletonBands;
    const anchorY = row * rowHeight - 80;
    const placedX: number[] = [];

    for (let s = 0; s < perRow; s++) {
      let x = -1;
      for (let attempt = 0; attempt < 60; attempt++) {
        const cand = config.flaskSpacingX / 2 + rng() * Math.max(1, width - config.flaskSpacingX);
        if (placedX.every((p) => Math.abs(p - cand) >= config.flaskSpacingX)) { x = cand; break; }
      }
      if (x < 0) continue;
      placedX.push(x);

      let skillIcon: string | undefined;
      let color: string | undefined;
      if (!isSkeleton && skillIdx < sorted.length) {
        skillIcon = sorted[skillIdx].svgPath;
        color = sorted[skillIdx].color;
        skillIdx++;
      }

      flasks.push({
        xPct: x / width,
        anchorY,
        segments: 2 + Math.floor(rng() * 3), // short chains on mobile
        color: color ?? PALETTE[Math.floor(rng() * PALETTE.length)],
        layer,
        skillIcon,
        isSkeleton,
      });
    }
  }
  flasks.sort((a, b) => b.layer - a.layer);
  return flasks;
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test`, all tests green).

- [ ] **Step 5: Commit**

```bash
git add flask-physics-poc/src/layout/generateFlaskField.ts flask-physics-poc/src/layout/generateFlaskField.test.ts
git commit -m "feat: generateFlaskField mobile row layout (TDD)"
```

---

## Phase 3 — Wire layout into the scene + skeleton flag

### Task 3.1: FlaskChain uses `isSkeleton`

**Files:**
- Modify: `src/components/FlaskChain.tsx`

- [ ] **Step 1: Add `isSkeleton` prop, replace `layer === 2` checks**

In `Props` add `isSkeleton?: boolean;`. In the body replace:
```ts
const isStatic = layer === 2;
```
with:
```ts
const isStatic = isSkeleton ?? layer === 2;
```
(Leave the rest of FlaskChain unchanged in this task — the RAF refactor is Phase 4.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: error in PhysicsScene only if it doesn't pass the prop yet — that's fixed in Task 3.2. If FlaskChain alone errors, fix the prop typing.

### Task 3.2: PhysicsScene uses `generateFlaskField`

**Files:**
- Modify: `src/components/PhysicsScene.tsx`

- [ ] **Step 1: Replace the inline generator with the module**

Remove `mulberry32`, `generateFlasks`, the `FLASK_COLORS` array, `FLASK_COUNT`, `MOBILE_FLASK_COUNT`, `MIN_SEGMENTS`, `MAX_SEGMENTS`, and the `FlaskConfig` interface from `PhysicsScene.tsx`. Replace with imports:
```ts
import { generateFlaskField } from "../layout/generateFlaskField";
import { getSessionSeed } from "../layout/rng";
import {
  COLUMN_COUNT, SKELETON_BANDS, FLASK_SPACING_X,
  MIN_FLASKS, MAX_FLASKS, MAX_PHYSICS_FLASKS, MOBILE_BREAKPOINT, FLASK_FRICTION,
} from "../physics/constants";
import type { LayoutConfig } from "../types/flask";
import skills from "../data/skills.json";
```

- [ ] **Step 2: Build config + seed + memoized flasks (count-keyed)**

```ts
const seed = useMemo(() => getSessionSeed(), []);
const layoutConfig: LayoutConfig = useMemo(() => ({
  columnCount: COLUMN_COUNT, skeletonBands: SKELETON_BANDS, flaskSpacingX: FLASK_SPACING_X,
  minFlasks: MIN_FLASKS, maxFlasks: MAX_FLASKS, maxPhysicsFlasks: MAX_PHYSICS_FLASKS,
}), []);

const isMobile = dims.width > 0 && dims.width < MOBILE_BREAKPOINT;

// Recompute only when the derived count (or mobile/seed) changes — not every resize px.
const targetCount = isMobile
  ? COLUMN_COUNT * Math.max(1, Math.floor(dims.width / FLASK_SPACING_X))
  : Math.max(MIN_FLASKS, Math.min(MAX_FLASKS, COLUMN_COUNT * Math.max(1, Math.floor(dims.width / FLASK_SPACING_X))));

const flasks = useMemo(
  () => dims.width > 0
    ? generateFlaskField({ width: dims.width, height: dims.height, isMobile, skills, seed, config: layoutConfig })
    : [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [targetCount, isMobile, seed]
);
```
> Note: positions are stored as `xPct`, so between count-steps a resize still repositions smoothly via `anchorX={cfg.xPct * dims.width}`.

- [ ] **Step 3: Pass `isSkeleton` + drive anchorY from config**

In the render map:
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
  skillIcon={cfg.skillIcon}
  isSkeleton={cfg.isSkeleton}
/>
```

- [ ] **Step 4: Add friction to walls**

In `createBoundaryWalls`, add `friction: FLASK_FRICTION` to both the top wall and each bottom-dome segment's options object.

- [ ] **Step 5: Typecheck, lint, build, manual run**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: all pass.
Run: `npm run dev`, open the app. Verify: field renders; resizing the window wider visibly adds flasks (density stays similar); back band has no icons; layout is stable on reload within the same tab and different after closing/reopening the tab.

- [ ] **Step 6: Commit**

```bash
git add flask-physics-poc/src/components/PhysicsScene.tsx flask-physics-poc/src/components/FlaskChain.tsx
git commit -m "feat: drive flask field from generateFlaskField + skeleton flag"
```

---

## Phase 4 — Single loop + quiescence guard

### Task 4.1: Sync registry + combined loop hook

**Files:**
- Create: `src/hooks/useFlaskFieldLoop.ts`

- [ ] **Step 1: Implement the registry + loop**

```ts
import { useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";

export type SyncFn = () => void;

export interface FlaskFieldLoop {
  register: (id: string, fn: SyncFn) => void;
  unregister: (id: string) => void;
  wake: () => void;
}

/**
 * One RAF drives BOTH Matter.Engine.update and every registered DOM-sync fn.
 * When no dynamic body is awake, the loop suspends (zero CPU). Any wake() call
 * (mousemove/scroll/resize/drag) resumes it for ENGINE_WAKE_MS.
 */
export function useFlaskFieldLoop(
  engine: Matter.Engine,
  wakeMs: number
): FlaskFieldLoop {
  const syncMap = useRef<Map<string, SyncFn>>(new Map());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const wakeUntilRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  const tick = useCallback((timestamp: number) => {
    if (lastTimeRef.current) {
      Matter.Engine.update(engine, Math.min(timestamp - lastTimeRef.current, 32));
    }
    lastTimeRef.current = timestamp;

    for (const fn of syncMap.current.values()) fn();

    const anyAwake = Matter.Composite.allBodies(engine.world)
      .some((b) => !b.isStatic && !b.isSleeping);
    const keepAlive = anyAwake || timestamp < wakeUntilRef.current;

    if (keepAlive) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      runningRef.current = false;
      lastTimeRef.current = 0; // reset delta on next resume
    }
  }, [engine]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const wake = useCallback(() => {
    wakeUntilRef.current = performance.now() + wakeMs;
    start();
  }, [start, wakeMs]);

  const register = useCallback((id: string, fn: SyncFn) => {
    syncMap.current.set(id, fn);
    wakeUntilRef.current = performance.now() + wakeMs;
    start();
  }, [start, wakeMs]);

  const unregister = useCallback((id: string) => {
    syncMap.current.delete(id);
  }, []);

  useEffect(() => {
    start(); // kick off once mounted
    return () => cancelAnimationFrame(rafRef.current);
  }, [start]);

  return { register, unregister, wake };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b` → no errors.

### Task 4.2: Provide the loop via context

**Files:**
- Modify: `src/hooks/useFlaskFieldLoop.ts` (add context)
- Modify: `src/components/PhysicsScene.tsx`
- Modify: `src/components/FlaskChain.tsx`

- [ ] **Step 1: Add a context to `useFlaskFieldLoop.ts`**

```ts
import { createContext, useContext } from "react";
export const FlaskFieldLoopContext = createContext<FlaskFieldLoop | null>(null);
export function useFlaskFieldLoopContext(): FlaskFieldLoop {
  const ctx = useContext(FlaskFieldLoopContext);
  if (!ctx) throw new Error("useFlaskFieldLoopContext must be used within provider");
  return ctx;
}
```

- [ ] **Step 2: PhysicsScene uses the loop + removes `useAnimationSync`**

In `PhysicsScene.tsx`:
- Remove `import { useAnimationSync } ...` and the `useAnimationSync(engine)` call.
- Add: `const loop = useFlaskFieldLoop(engine, ENGINE_WAKE_MS);` (import `ENGINE_WAKE_MS`).
- Wrap the returned flask list in `<FlaskFieldLoopContext.Provider value={loop}>`.
- In the scroll effect, call `loop.wake()` right after applying scroll force.
- In the resize effect (the `ResizeObserver` setting `dims`), call `loop.wake()` when dims change.

- [ ] **Step 3: FlaskChain registers a sync fn instead of its own RAF**

In `FlaskChain.tsx`:
- Import `useFlaskFieldLoopContext`.
- Keep `syncDom` body, but **remove the trailing `rafRef.current = requestAnimationFrame(syncDom);`** lines (both the early-return one and the end-of-fn one) so `syncDom` performs exactly one sync per call.
- Remove the `useEffect` that did `rafRef.current = requestAnimationFrame(syncDom)`.
- Replace with:
```ts
const loop = useFlaskFieldLoopContext();
useEffect(() => {
  if (isStatic) return;
  loop.register(instanceId, syncDom);
  return () => loop.unregister(instanceId);
}, [loop, instanceId, isStatic, syncDom]);
```
- Keep the sleeping early-out inside `syncDom` (now just `if (flask.body.isSleeping) return;`).

- [ ] **Step 4: Typecheck, lint, build**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: pass. Remove the now-unused `rafRef` if lint flags it.

- [ ] **Step 5: Delete `useAnimationSync.ts`**

Run: `git rm flask-physics-poc/src/hooks/useAnimationSync.ts`
(Confirm no other importers: `grep -rn useAnimationSync flask-physics-poc/src` → none.)

- [ ] **Step 6: Manual verification (the core perf goal)**

Run `npm run dev`. Toggle the DebugPanel "Updates" overlay.
Verify: when you drag/throw a flask the engine ticks/s is ~60 and "Awake" > 0; when everything settles, **Awake → 0 and ticks/s → 0** (engine suspended). Moving the mouse over the container brings ticks/s back up briefly, then it re-settles.

- [ ] **Step 7: Commit**

```bash
git add -A flask-physics-poc/src/hooks flask-physics-poc/src/components/PhysicsScene.tsx flask-physics-poc/src/components/FlaskChain.tsx
git commit -m "perf: single engine+sync loop with quiescence guard"
```

### Task 4.3: DebugPanel shows SUSPENDED

**Files:**
- Modify: `src/components/DebugPanel.tsx`

- [ ] **Step 1: Show suspended state in `UpdatesOverlay`**

In the `UpdatesOverlay` return, change the ticks line to:
```tsx
<div>
  Engine: {stats.totalUpdatesPerSec === 0
    ? <span style={{ color: "#0ff" }}>SUSPENDED (idle = 0 CPU)</span>
    : `${stats.totalUpdatesPerSec} ticks/s`}
</div>
```

- [ ] **Step 2: Build + commit**

Run: `npm run build` → pass.
```bash
git add flask-physics-poc/src/components/DebugPanel.tsx
git commit -m "feat(debug): show SUSPENDED when engine is idle"
```

---

## Phase 5 — Mouse overhaul (sensor cursor, shake, friction)

### Task 5.1: Contact friction on flask bodies

**Files:**
- Modify: `src/physics/createFlaskBody.ts`

- [ ] **Step 1: Add friction + keep sleep reachable**

In the `Matter.Bodies.trapezoid(...)` options, add `friction: FLASK_FRICTION,` (import it). Leave `frictionAir: 0.025`, `restitution: 0`. Keep `sleepThreshold: 30` for now (revisit in Task 5.4 if bodies don't sleep).

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc -b` → pass.
```bash
git add flask-physics-poc/src/physics/createFlaskBody.ts
git commit -m "feat(physics): contact friction on flasks"
```

### Task 5.2: Sensor cursor body

**Files:**
- Create: `src/physics/cursorBody.ts`

- [ ] **Step 1: Implement**

```ts
import Matter from "matter-js";
import { MOUSE_BODY_RADIUS, CAT_MOUSE, MOUSE_MASK } from "./constants";

export function createCursorBody(): Matter.Body {
  return Matter.Bodies.circle(-1000, -1000, MOUSE_BODY_RADIUS, {
    isStatic: true,
    isSensor: true,            // detect-only; never pushes a flask
    collisionFilter: { category: CAT_MOUSE, mask: MOUSE_MASK },
    label: "cursor",
  });
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc -b` → pass.
```bash
git add flask-physics-poc/src/physics/cursorBody.ts
git commit -m "feat(physics): sensor cursor body"
```

### Task 5.3: Wire cursor + shake-on-hit + mousemove wake into useMousePhysics

**Files:**
- Modify: `src/hooks/useMousePhysics.ts`

- [ ] **Step 1: Accept the loop + add cursor/shake logic**

Change the signature to also take the loop:
```ts
import { createCursorBody } from "../physics/cursorBody";
import { SHAKE_IMPULSE, SHAKE_COOLDOWN_MS, MOBILE_BREAKPOINT } from "../physics/constants";
import type { FlaskFieldLoop } from "./useFlaskFieldLoop";

export function useMousePhysics(
  engine: Matter.Engine,
  containerRef: React.RefObject<HTMLDivElement | null>,
  loop: FlaskFieldLoop
) { /* ... */ }
```

Inside the effect, after `getWorldPos` is defined:
```ts
const isTouch = window.innerWidth < MOBILE_BREAKPOINT
  || ("ontouchstart" in window);

// Desktop only: a sensor body follows the cursor for bump detection.
const cursor = isTouch ? null : createCursorBody();
if (cursor) Matter.Composite.add(engine.world, cursor);

const lastShake = new Map<number, number>();

const shake = (flask: Matter.Body) => {
  const now = performance.now();
  if (now - (lastShake.get(flask.id) ?? 0) < SHAKE_COOLDOWN_MS) return;
  lastShake.set(flask.id, now);
  Matter.Sleeping.set(flask, false);
  const dir = Math.random() < 0.5 ? -1 : 1;
  Matter.Body.setVelocity(flask, {
    x: dir * SHAKE_IMPULSE, y: flask.velocity.y,
  });
  loop.wake();
};

const onCollision = (e: Matter.IEventCollision<Matter.Engine>) => {
  for (const pair of e.pairs) {
    const flask =
      pair.bodyA.label === "cursor" && pair.bodyB.label === "flask" ? pair.bodyB :
      pair.bodyB.label === "cursor" && pair.bodyA.label === "flask" ? pair.bodyA : null;
    if (flask && !flask.isStatic) shake(flask);
  }
};
Matter.Events.on(engine, "collisionStart", onCollision);
```

- [ ] **Step 2: Move the cursor + wake on mousemove**

In `moveDrag` (or a dedicated mousemove handler), when not dragging, also:
```ts
if (cursor) {
  const pos = getWorldPos(clientX, clientY);
  Matter.Body.setPosition(cursor, pos);
  loop.wake(); // suspended engine can't detect a bump without this
}
```
Keep the existing cursor-style hover logic and the existing drag code paths.

- [ ] **Step 3: Cleanup in the effect's return**

Add to the cleanup:
```ts
Matter.Events.off(engine, "collisionStart", onCollision);
if (cursor) Matter.Composite.remove(engine.world, cursor);
```

- [ ] **Step 4: Update the call site**

In `PhysicsScene.tsx`: `useMousePhysics(engine, containerRef, loop);`

- [ ] **Step 5: Typecheck, lint, build**

Run: `npx tsc -b && npm run lint && npm run build` → pass.

- [ ] **Step 6: Manual verification**

Run `npm run dev`.
- Desktop: moving the cursor *into* a flask makes it shake left↔right and settle; flasks resist sliding (friction); click-drag still works; sweeping the cursor through repeatedly does not pin CPU (cooldown), and the field re-suspends after settling (DebugPanel "Updates").
- Confirm the smaller hit feel: you must actually touch a flask, not just get near it.

- [ ] **Step 7: Commit**

```bash
git add flask-physics-poc/src/hooks/useMousePhysics.ts flask-physics-poc/src/components/PhysicsScene.tsx
git commit -m "feat(mouse): sensor-cursor bump shake + contact friction + mousemove wake"
```

### Task 5.4: Sleep-reachability tuning (load-bearing)

**Files:**
- Modify: `src/physics/createFlaskBody.ts` and/or `src/physics/constants.ts`

- [ ] **Step 1: Verify flasks actually sleep with friction on**

Run `npm run dev`, DebugPanel "Updates". Drag several flasks, let go, wait. Confirm "Awake" reaches 0 within a few seconds and "Engine" shows SUSPENDED.

- [ ] **Step 2: If they never sleep, tune**

If "Awake" stays > 0 indefinitely (the historical runaway bug): raise `frictionAir` (e.g. 0.025 → 0.04) and/or raise `sleepThreshold` (30 → 45) on the flask body, and ensure `SHAKE_IMPULSE` isn't so large that flasks bounce off walls forever. Re-test until idle reliably suspends. Document the final values in a one-line comment.

- [ ] **Step 3: Commit (only if values changed)**

```bash
git add flask-physics-poc/src/physics/createFlaskBody.ts flask-physics-poc/src/physics/constants.ts
git commit -m "tune(physics): ensure flasks reach sleep with contact friction"
```

---

## Phase 6 — Final verification

### Task 6.1: Full gate

- [ ] **Step 1: Run everything**

Run: `cd flask-physics-poc && npm test && npx tsc -b && npm run lint && npm run build`
Expected: tests pass, no type errors, no lint errors, build succeeds.

- [ ] **Step 2: Manual desktop checklist (dev server)**

- Wider window ⇒ more flasks, similar density (resize across a few widths).
- Front band has icons + hangs higher; back band is icon-less skeleton, no physics.
- Idle ⇒ DebugPanel shows SUSPENDED (0 ticks/s).
- Mouse into a flask ⇒ L↔R shake, settles, friction grip; drag works; no CPU pin.
- Reload same tab ⇒ identical layout; new tab ⇒ different layout.

- [ ] **Step 3: Mobile (flagged, on-device)**

The in-session browser can't shrink below desktop widths (known limitation). On a real phone / DevTools device mode, confirm: row-based layout fills the height, drag works, no bump/hover behavior, acceptable framerate.

- [ ] **Step 4: Final commit / branch wrap-up**

```bash
git add -A && git commit -m "chore: flask field redesign complete" || echo "nothing to commit"
```

---

## Self-Review (against the spec)

- **Data model (JSON priority/color):** Tasks 1.1, 1.2 (priority added; `color` optional & consumed via `skill.color` in 2.2/2.3). ✓
- **Constant density, width-driven:** Task 2.2 (`perBand = floor(width/spacingX)`), tested. ✓
- **Depth bands + configurable count + skeleton back bands:** Tasks 1.3, 2.2, 3.1, 3.2. ✓
- **Overflow → plain flasks; omit low-priority when slots < skills:** Task 2.2 tests. ✓
- **Priority ⇒ depth + height:** Task 2.2 (`segmentsForRank`, front-band assignment), tested. ✓
- **Per-session seed:** Tasks 2.1, 3.2. ✓
- **Single RAF + quiescence (idle = 0 CPU):** Tasks 4.1, 4.2; verified 4.2 step 6 + DebugPanel 4.3. ✓
- **Body budget:** Task 2.2 (`maxPhysicsFlasks`), tested. ✓
- **Mouse: sensor cursor, L↔R shake, cooldown, mousemove-wake:** Tasks 5.2, 5.3. ✓
- **Mobile = drag only:** Task 5.3 (`isTouch` gate; no cursor body). ✓
- **Contact friction made safe by reachable sleep + guard:** Tasks 5.1, 5.4. ✓
- **Verification incl. mobile caveat:** Phase 6. ✓

No placeholders; types (`SkillEntry`, `LayoutConfig`, `FlaskConfig`, `FlaskFieldLoop`, `SyncFn`) are consistent across tasks.
