# Portfolio Version System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host multiple complete portfolio versions in one Next app — the 2024 static site archived and served at `/v/2024`, the 2026 app at root — with a JSON manifest, a version switcher + build/stack readout in a renamed "Technical" panel.

**Architecture:** Approach A (static snapshot + rewrites). The 2024 site's full source is moved into the repo at `web/versions/2024/` (kept in git); a prebuild script copies its runtime subset to the gitignored `web/public/v/2024/`, which Next serves via a rewrite. A manifest (`web/src/data/versions.json`) drives the switcher. Build metadata is injected at build time as `NEXT_PUBLIC_*` env (static, zero runtime cost).

**Tech Stack:** Next.js 16.2.6 (App Router, `[lang]` segment, no middleware), React, Tailwind, matter-js (unrelated), vitest + tsc (the repo gates). All work on branch `feature/underwater-outro`.

**Pre-flight notes:**
- `web/AGENTS.md`: this Next 16 differs from training data. The rewrites/redirects API used here was verified against `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/`. Array `rewrites()` run *after* the filesystem/`public` check, so `/v/2024/css/*` hit static files directly and only `/v/2024` needs a rewrite to `index.html`.
- Repo gates: `npm test` (vitest) and `npx tsc --noEmit`. `next build` does NOT lint (don't rely on it for lint). `npm run lint` has pre-existing react-compiler errors — ignore those.
- The in-session Chrome tab is hidden (rAF/render paused); verify the served old site over `curl` against a running server, not screenshots.
- Shared branch: a concurrent agent also commits here. Stage only the files each task names; never `git commit -a`.

---

## File Structure

**Created:**
- `web/versions/2024/**` — moved from repo-root `src/` (archival source, committed).
- `web/scripts/sync-versions.mjs` — copies `versions/2024` → `public/v/2024`.
- `web/src/data/versions.json` — version manifest.
- `web/src/lib/versions.ts` + `.test.ts` — typed manifest accessors.
- `web/src/lib/buildEnv.ts` + `.test.ts` — build-time metadata computation (node).
- `web/src/lib/buildInfo.ts` — client-readable build metadata (reads `NEXT_PUBLIC_*`).
- `web/src/app/[lang]/technical/page.tsx` — moved from `settings/page.tsx`.
- `web/src/components/technical/TechnicalPanel.tsx` — moved/renamed from `settings/SettingsPanel.tsx`.

**Modified:**
- `web/next.config.ts` — `env`, `rewrites()`, `redirects()`.
- `web/.gitignore` — ignore generated `public/v/`.
- `web/package.json` — `sync:versions` + `predev`/`prebuild` hooks.
- `web/src/i18n/types.ts`, `dictionaries/en.json`, `dictionaries/de.json` — `settings` → `technical`.
- `web/src/components/layout/Header.tsx` — link + label `/settings` → `/technical`.

**Deleted:** repo-root `src/` (moved, not destroyed).

---

## Task 1: Archive the 2024 site into the repo (move + redact contact + base href)

**Files:**
- Move: `src/` → `web/versions/2024/`
- Modify: `web/versions/2024/index.html`
- Modify: `web/versions/2024/js/script.js`

- [ ] **Step 1: Move the old site under web/**

```bash
cd /Users/yannic/dev/webportfolio
git mv src web/versions/2024 2>/dev/null || { mkdir -p web/versions && git mv src web/versions/2024; }
```

If `git mv` fails because of untracked files in `src/`, move with plain `mv` then `git add`:
```bash
mkdir -p web/versions && mv src web/versions/2024 && git add web/versions/2024
```

- [ ] **Step 2: Inject `<base>` so relative asset paths resolve under /v/2024/**

Edit `web/versions/2024/index.html`. Replace:
```html
<head>
   <title>Yannic Studer - Webportfolio</title>
```
with:
```html
<head>
   <base href="/v/2024/">
   <title>Yannic Studer - Webportfolio</title>
```

- [ ] **Step 3: Remove the header `.contact` mailto link**

In `web/versions/2024/index.html`, delete this entire `<li>` (was ~lines 67-71):
```html
                  <li>
                     <a id="headContact" href="mailto:yannic.studer@protonmail.com">
                        .contact
                     </a>
                  </li>
```

- [ ] **Step 4: Remove the `#fix3` "Contact me?" block (phone + email)**

In `web/versions/2024/index.html`, delete this block (was ~lines 446-450):
```html
         <div id="fix3" class="byeContact">
            <h1>Contact me?</h1>
            <p><a href="mailto:yannic.studer@protonmail.com">yannic.studer@protonmail.com</a></p>
            <p><a href="tel:+41 78 775 39 78">+41 78 775 39 78</a></p>
         </div>
```

- [ ] **Step 5: Remove the now-dead DOM references in script.js**

In `web/versions/2024/js/script.js`, delete these four lines (the elements no longer exist; left in, they throw on `.classList`):
```javascript
   let hContact = document.getElementById("headContact");
```
```javascript
   let fix3 = document.getElementById("fix3");
```
```javascript
   hContact.classList.toggle("colorDark");
```
```javascript
   fix3.classList.toggle("colorBlack");//
```

- [ ] **Step 6: Verify redaction + base, no dead refs**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web/versions/2024
grep -rniE 'mailto:|tel:|protonmail|\+?41 ?78|775 ?39|headContact|fix3' . --include='*.html' --include='*.js'
grep -c 'base href="/v/2024/"' index.html
```
Expected: first grep prints **nothing** (no contact data, no dead refs). Second prints `1`.

- [ ] **Step 7: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/versions/2024
git commit -m "feat(versions): archive 2024 site under web/versions, redact contact PII

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Generate the served snapshot (sync script + gitignore + npm hooks)

**Files:**
- Create: `web/scripts/sync-versions.mjs`
- Modify: `web/.gitignore`
- Modify: `web/package.json`

- [ ] **Step 1: Write the sync script**

Create `web/scripts/sync-versions.mjs`:
```javascript
// Copies each archived version's runtime files into public/v/<id>,
// excluding source-only artifacts (.scss, .map) and OS cruft.
import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXCLUDE = /(\.scss$|\.map$|\.DS_Store$)/;

const versions = ["2024"]; // archived (non-latest) static versions

for (const id of versions) {
  const src = join(root, "versions", id);
  const dest = join(root, "public", "v", id);
  if (!existsSync(src)) {
    console.error(`[sync-versions] missing source: ${src}`);
    process.exit(1);
  }
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, {
    recursive: true,
    filter: (p) => !EXCLUDE.test(p),
  });
  console.log(`[sync-versions] ${id} -> public/v/${id}`);
}
```

- [ ] **Step 2: Ignore the generated output**

Append to `web/.gitignore`:
```
# generated version snapshots (source lives in web/versions/<id>)
/public/v/
```

- [ ] **Step 3: Wire npm lifecycle hooks**

In `web/package.json`, replace the `"scripts"` block:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```
with:
```json
  "scripts": {
    "sync:versions": "node scripts/sync-versions.mjs",
    "predev": "npm run sync:versions",
    "dev": "next dev",
    "prebuild": "npm run sync:versions",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 4: Run the sync and verify output**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
npm run sync:versions
test -f public/v/2024/index.html && echo "OK index" || echo "MISSING index"
find public/v/2024 -name '*.scss' -o -name '*.map' | head
git check-ignore public/v/2024/index.html
```
Expected: `[sync-versions] 2024 -> public/v/2024`; `OK index`; the find prints **nothing** (no scss/map copied); `git check-ignore` prints the path (confirming it's ignored).

- [ ] **Step 5: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/scripts/sync-versions.mjs web/.gitignore web/package.json
git commit -m "feat(versions): sync script generates public/v/<id> from web/versions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Serve the 2024 snapshot at /v/2024 (Next rewrite)

**Files:**
- Modify: `web/next.config.ts`

- [ ] **Step 1: Add the rewrite**

Replace `web/next.config.ts` contents with:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    // Array rewrites run AFTER the filesystem/public check, so
    // /v/2024/<asset> is served from public directly; only the bare
    // directory path needs mapping to its index.html.
    return [{ source: "/v/2024", destination: "/v/2024/index.html" }];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Build and serve, then curl the old site**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
npm run build && (npm run start &) && sleep 4
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/v/2024
curl -s http://localhost:3000/v/2024 | grep -c 'base href="/v/2024/"'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/v/2024/css/main.css
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/v/2024/js/script.js
```
Expected: `200` for `/v/2024`; `1` for the base grep; `200` for the CSS and JS assets.

- [ ] **Step 3: Stop the server**

```bash
pkill -f "next start" 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/next.config.ts
git commit -m "feat(versions): serve 2024 archive at /v/2024 via rewrite

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Version manifest + typed accessors (TDD)

**Files:**
- Create: `web/src/data/versions.json`
- Create: `web/src/lib/versions.ts`
- Test: `web/src/lib/versions.test.ts`

- [ ] **Step 1: Write the manifest**

Create `web/src/data/versions.json`:
```json
[
  { "id": "2026", "label": "Portfolio 2026", "year": 2026, "type": "next", "path": "/", "isLatest": true },
  { "id": "2024", "label": "Portfolio 2024", "year": 2024, "type": "static", "path": "/v/2024", "isLatest": false }
]
```

- [ ] **Step 2: Write the failing test**

Create `web/src/lib/versions.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { versions, getLatest, currentVersionId } from "./versions";

describe("versions manifest", () => {
  it("loads versions with exactly one latest", () => {
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions.filter((v) => v.isLatest)).toHaveLength(1);
  });

  it("getLatest returns the latest entry", () => {
    expect(getLatest().id).toBe("2026");
    expect(getLatest().path).toBe("/");
  });

  it("currentVersionId reads the /v/<id> prefix", () => {
    expect(currentVersionId("/v/2024")).toBe("2024");
    expect(currentVersionId("/v/2024/anything")).toBe("2024");
  });

  it("currentVersionId falls back to latest off the /v/ namespace", () => {
    expect(currentVersionId("/")).toBe("2026");
    expect(currentVersionId("/en")).toBe("2026");
    expect(currentVersionId("/en/technical")).toBe("2026");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/versions.test.ts`
Expected: FAIL — cannot resolve `./versions`.

- [ ] **Step 4: Write the implementation**

Create `web/src/lib/versions.ts`:
```typescript
import versionsData from "@/data/versions.json";

export type VersionType = "next" | "static" | "zone";

export interface Version {
  id: string;
  label: string;
  year: number;
  type: VersionType;
  path: string;
  isLatest: boolean;
}

export const versions: Version[] = versionsData as Version[];

export function getLatest(): Version {
  return versions.find((v) => v.isLatest) ?? versions[0];
}

/** Resolve which version a pathname belongs to. Archived versions live
 *  under /v/<id>; everything else is the latest (served at root). */
export function currentVersionId(pathname: string): string {
  const m = pathname.match(/^\/v\/([^/]+)/);
  return m ? m[1] : getLatest().id;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/versions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/data/versions.json web/src/lib/versions.ts web/src/lib/versions.test.ts
git commit -m "feat(versions): manifest + typed accessors

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Build-time metadata injection (TDD on the pure parts)

**Files:**
- Create: `web/src/lib/buildEnv.ts`
- Test: `web/src/lib/buildEnv.test.ts`
- Create: `web/src/lib/buildInfo.ts`
- Modify: `web/next.config.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/buildEnv.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanRange, computeBuildEnv } from "./buildEnv";

describe("buildEnv", () => {
  it("cleanRange strips semver range operators", () => {
    expect(cleanRange("^16.2.6")).toBe("16.2.6");
    expect(cleanRange("~1.0.0")).toBe("1.0.0");
    expect(cleanRange(">=2.3.4")).toBe("2.3.4");
    expect(cleanRange(undefined)).toBe("");
  });

  it("computeBuildEnv version matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    );
    const env = computeBuildEnv();
    expect(env.NEXT_PUBLIC_APP_VERSION).toBe(pkg.version);
    expect(env.NEXT_PUBLIC_STACK_NEXT).toMatch(/^\d+\.\d+/);
    expect(env.NEXT_PUBLIC_GIT_SHA.length).toBeGreaterThan(0);
    expect(env.NEXT_PUBLIC_BUILD_DATE).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/buildEnv.test.ts`
Expected: FAIL — cannot resolve `./buildEnv`.

- [ ] **Step 3: Write the implementation**

Create `web/src/lib/buildEnv.ts`:
```typescript
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Strip leading semver range operators (^ ~ >= etc.) for display. */
export function cleanRange(range?: string): string {
  return typeof range === "string" ? range.replace(/^[\^~>=<\s]+/, "") : "";
}

/** Computed at build time (next.config) — node-only. Returns NEXT_PUBLIC_*
 *  strings that get inlined into the client bundle (static, zero runtime cost). */
export function computeBuildEnv(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  );
  let sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      sha = "unknown";
    }
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return {
    NEXT_PUBLIC_APP_VERSION: String(pkg.version ?? "0.0.0"),
    NEXT_PUBLIC_GIT_SHA: sha,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
    NEXT_PUBLIC_STACK_NEXT: cleanRange(deps.next),
    NEXT_PUBLIC_STACK_REACT: cleanRange(deps.react),
    NEXT_PUBLIC_STACK_TAILWIND: cleanRange(deps.tailwindcss),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/yannic/dev/webportfolio/web && npx vitest run src/lib/buildEnv.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the client-readable accessor**

Create `web/src/lib/buildInfo.ts`:
```typescript
export interface BuildInfo {
  version: string;
  gitSha: string;
  buildDate: string;
  stack: { next: string; react: string; tailwind: string };
}

// NEXT_PUBLIC_* are inlined at build time, so this is a static constant.
export const buildInfo: BuildInfo = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
  gitSha: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE ?? "",
  stack: {
    next: process.env.NEXT_PUBLIC_STACK_NEXT ?? "",
    react: process.env.NEXT_PUBLIC_STACK_REACT ?? "",
    tailwind: process.env.NEXT_PUBLIC_STACK_TAILWIND ?? "",
  },
};
```

- [ ] **Step 6: Wire it into next.config.ts**

Replace `web/next.config.ts` with (adds `env` to the Task 3 config):
```typescript
import type { NextConfig } from "next";
import { computeBuildEnv } from "./src/lib/buildEnv";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: computeBuildEnv(),
  async rewrites() {
    return [{ source: "/v/2024", destination: "/v/2024/index.html" }];
  },
};

export default nextConfig;
```

- [ ] **Step 7: Verify build inlines the values**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
npx tsc --noEmit && npm run build
grep -rho 'NEXT_PUBLIC_APP_VERSION[^,]*' .next 2>/dev/null | head -1 || echo "(inlined as literal — expected)"
```
Expected: `tsc` clean, build succeeds. (The grep is best-effort; the real check is the Build section in Task 8 rendering real values.)

- [ ] **Step 8: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/lib/buildEnv.ts web/src/lib/buildEnv.test.ts web/src/lib/buildInfo.ts web/next.config.ts
git commit -m "feat(versions): inject version/sha/build-date/stack at build time

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Rename i18n key settings → technical

**Files:**
- Modify: `web/src/i18n/types.ts`
- Modify: `web/src/i18n/dictionaries/en.json`
- Modify: `web/src/i18n/dictionaries/de.json`
- Modify: `web/src/components/layout/Header.tsx`
- Modify: `web/src/components/settings/SettingsPanel.tsx` (moved in Task 7; update label refs here so tsc stays green)

- [ ] **Step 1: Rename the type key**

In `web/src/i18n/types.ts`, change:
```typescript
    settings: string;
```
to:
```typescript
    technical: string;
```

- [ ] **Step 2: Rename the dictionary values**

In `web/src/i18n/dictionaries/en.json`, change `"settings": "Settings"` to:
```json
    "technical": "Technical"
```
In `web/src/i18n/dictionaries/de.json`, change `"settings": "Einstellungen"` to:
```json
    "technical": "Technisch"
```
(Keep each object's other keys and trailing-comma structure intact.)

- [ ] **Step 3: Update all `dict.nav.settings` references**

In `web/src/components/layout/Header.tsx`, replace both occurrences of `dict.nav.settings` (lines ~104, ~187) with `dict.nav.technical`.

In `web/src/components/settings/SettingsPanel.tsx`, replace both occurrences of `dict.nav.settings` (lines ~220, ~222) with `dict.nav.technical`.

- [ ] **Step 4: Verify no stale key + types compile**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
grep -rn 'nav.settings\|"settings"' src/ ; echo "---"
npx tsc --noEmit && echo "tsc OK"
```
Expected: first grep prints **nothing**; `tsc OK`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/i18n web/src/components/layout/Header.tsx web/src/components/settings/SettingsPanel.tsx
git commit -m "refactor(i18n): rename nav.settings -> nav.technical

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Move route + component to /technical, add redirect

**Files:**
- Move: `web/src/components/settings/SettingsPanel.tsx` → `web/src/components/technical/TechnicalPanel.tsx`
- Move: `web/src/app/[lang]/settings/page.tsx` → `web/src/app/[lang]/technical/page.tsx`
- Modify: `web/src/components/layout/Header.tsx`
- Modify: `web/next.config.ts`

- [ ] **Step 1: Move + rename the component**

```bash
cd /Users/yannic/dev/webportfolio/web
mkdir -p src/components/technical
git mv src/components/settings/SettingsPanel.tsx src/components/technical/TechnicalPanel.tsx
rmdir src/components/settings 2>/dev/null || true
```
In `src/components/technical/TechnicalPanel.tsx`, rename the export:
```typescript
export default function SettingsPanel({
```
to:
```typescript
export default function TechnicalPanel({
```

- [ ] **Step 2: Move + repoint the route page**

```bash
cd /Users/yannic/dev/webportfolio/web
mkdir -p "src/app/[lang]/technical"
git mv "src/app/[lang]/settings/page.tsx" "src/app/[lang]/technical/page.tsx"
rmdir "src/app/[lang]/settings" 2>/dev/null || true
```
In `src/app/[lang]/technical/page.tsx`, update the import:
```typescript
import SettingsPanel from "@/components/settings/SettingsPanel";
```
to:
```typescript
import TechnicalPanel from "@/components/technical/TechnicalPanel";
```
and update the JSX usage of `<SettingsPanel ... />` to `<TechnicalPanel ... />`.

- [ ] **Step 3: Update Header navigation targets**

In `web/src/components/layout/Header.tsx`, replace both `navigateTo(`/${lang}/settings`)` calls (lines ~99, ~182) with `navigateTo(`/${lang}/technical`)`.

- [ ] **Step 4: Add the redirect**

Replace `web/next.config.ts` with:
```typescript
import type { NextConfig } from "next";
import { computeBuildEnv } from "./src/lib/buildEnv";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: computeBuildEnv(),
  async rewrites() {
    return [{ source: "/v/2024", destination: "/v/2024/index.html" }];
  },
  async redirects() {
    // Old /settings path renamed to /technical. Keep the slash before ":".
    return [
      {
        source: "/:lang/settings",
        destination: "/:lang/technical",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 5: Verify routes, redirect, and no stale paths**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
grep -rn '/settings\|components/settings\|SettingsPanel' src/ ; echo "---"
npx tsc --noEmit && npm run build && (npm run start &) && sleep 4
curl -s -o /dev/null -w "technical=%{http_code}\n" http://localhost:3000/en/technical
curl -s -o /dev/null -w "settings=%{http_code} -> %{redirect_url}\n" http://localhost:3000/en/settings
pkill -f "next start" 2>/dev/null || true
```
Expected: first grep prints **nothing**; `tsc` clean; build OK; `technical=200`; `settings=308 -> .../en/technical`.

- [ ] **Step 6: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add -A web/src/app web/src/components web/next.config.ts
git commit -m "refactor(technical): move settings page+panel to /technical, redirect old path

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Versions + Build sections in the Technical panel

**Files:**
- Modify: `web/src/components/technical/TechnicalPanel.tsx`

- [ ] **Step 1: Import the manifest, build info, and the current path**

At the top of `web/src/components/technical/TechnicalPanel.tsx`, add to the imports:
```typescript
import { usePathname } from "next/navigation";
import { versions, currentVersionId } from "@/lib/versions";
import { buildInfo } from "@/lib/buildInfo";
```

- [ ] **Step 2: Compute the active version inside the component**

Inside `TechnicalPanel`, after the existing hook calls, add:
```typescript
  const pathname = usePathname();
  const activeVersion = currentVersionId(pathname ?? "/");
```

- [ ] **Step 3: Render Versions + Build in the diagnostics tab**

The `diagnostics` branch currently returns a single grid `<div>`. To add a second sibling block it must return a fragment. First, find:
```tsx
      ) : tab === "diagnostics" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
```
and change it to:
```tsx
      ) : tab === "diagnostics" ? (
        <>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
```
Then find the end of that grid and the start of the next (`store`) branch:
```tsx
          <Section title="Hardware" rows={hardware} />
        </div>
      ) : (
```
and change it to (grid close, then the new block, then the fragment close):
```tsx
          <Section title="Hardware" rows={hardware} />
        </div>

          <div className="mt-4 space-y-4">
            <div className="border border-border">
              <PanelHead>Versions</PanelHead>
              <ul className="divide-y divide-border">
                {versions.map((v) => {
                  const active = v.id === activeVersion;
                  return (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{v.label}</span>
                        {v.isLatest && (
                          <span className="lab-label text-accent">latest</span>
                        )}
                        {active && <Check size={14} className="text-accent" />}
                      </span>
                      <a
                        href={v.path}
                        className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {v.path}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Section
              title="Build"
              rows={[
                ["Version", buildInfo.version],
                ["Commit", buildInfo.gitSha],
                ["Built", buildInfo.buildDate.slice(0, 19).replace("T", " ")],
                ["Next.js", buildInfo.stack.next],
                ["React", buildInfo.stack.react],
                ["Tailwind", buildInfo.stack.tailwind],
              ]}
            />
          </div>
        </>
      ) : (
```
This re-establishes the `) : (` boundary to the `store` tab branch (consumed by the anchor edit above). `Check`, `PanelHead`, and `Section` already exist in this file — reuse them.

- [ ] **Step 4: Verify it compiles, builds, and renders real data**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
npx tsc --noEmit && npm run build && (npm run start &) && sleep 4
# Versions section: the /v/2024 switch link is present in the diagnostics HTML
curl -s http://localhost:3000/en/technical | grep -o 'href="/v/2024"' | head -1
# Build section: the real version string is present
curl -s http://localhost:3000/en/technical | grep -o "$(node -p "require('./package.json').version")" | head -1
# The 2024 archive still serves and switch target works
curl -s -o /dev/null -w "v2024=%{http_code}\n" http://localhost:3000/v/2024
pkill -f "next start" 2>/dev/null || true
```
Expected: prints `href="/v/2024"`; prints the package version (e.g. `0.1.0`); `v2024=200`.

- [ ] **Step 5: Run the full gate**

Run:
```bash
cd /Users/yannic/dev/webportfolio/web
npm test && npx tsc --noEmit
```
Expected: all vitest tests pass; `tsc` clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/yannic/dev/webportfolio
git add web/src/components/technical/TechnicalPanel.tsx
git commit -m "feat(technical): version switcher + build/stack readout in panel

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (whole feature)

- [ ] `cd web && npm test && npx tsc --noEmit` — gates green.
- [ ] `cd web && npm run build` — succeeds (runs `prebuild` sync first).
- [ ] `npm run start`, then: `/` (or `/en`) loads the 2026 app; `/v/2024` loads the redacted old site with working CSS/JS; `/en/technical` shows the Versions list (2026 latest + 2024) and the Build readout with real version/SHA/date/stack; `/en/settings` 308-redirects to `/en/technical`.
- [ ] `grep -rniE 'mailto:|tel:|protonmail|775 ?39' web/versions/2024 web/public/v/2024` — prints nothing.

## Notes / out-of-scope (do not build now)

- Snapshotting the 2026 app to `/v/2026` when a newer version becomes latest.
- Multi-Zones for a future `type: "zone"` version.
- A standalone `/versions` archive page with previews.
- `web/versions/2024/404.html` is archived but not wired into Next routing (Next owns 404s); it contains no contact data, so it's left untouched.
