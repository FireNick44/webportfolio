# Next.js Portfolio Rework — Design Spec

**Date:** 2026-05-21
**Owner:** Noel Studer
**Status:** Draft for review

## 1. Goal

Rebuild the personal portfolio as a single, scrollable Next.js application that:

- Replaces the old vanilla HTML/SCSS/JS site (`webportfolio/src/`).
- Carries the identity change **Yannic Studer → Noel Studer** everywhere.
- **Removes the displayed email address and phone number**, replacing contact with a Resend + react-email form.
- Reuses the animated **bubbles SVG** (`src/svg/intro-bg.svg`) as a living backdrop.
- Replaces the static flask `.webp` images in the Skills area with the **real Matter.js flask physics** from `flask-physics-poc/`.
- Adopts the architecture patterns proven in the `beatloops` project (theme system, settings page, layout chrome, i18n).
- Feels integrated, seamless, smooth, and premium, and is optimized across mobile/tablet/desktop.

## 2. Scope

**In scope:** new Next.js app, all portfolio sections, physics integration, bubbles backdrop, theme toggle, bilingual EN/DE, contact form via Resend, settings page, responsive + reduced-motion handling, asset migration, content rewrite for Noel Studer.

**Out of scope (now):** CMS/admin, blog, analytics, real backend beyond the email server action, PWA/offline, deployment/CI changes. Project links keep the existing `github.com/FireNick44/…` handle unless changed later.

## 3. Aesthetic direction — "Digital alchemy lab"

Near-monochrome canvas (true black / warm off-white) so the **only saturated color comes from the liquid inside the flasks**. Dark by default (matches current site), light via a View-Transitions theme swipe.

- **Typography:** Display = **BerlinType** (existing brand face, local woff2 via `next/font/local`). Body = a characterful non-generic grotesque (default: **Hanken Grotesk**). Mono = lab-style captions/labels (default: **JetBrains Mono**). Explicitly avoid Inter / Roboto / Arial / Space Grotesk.
- **Motion:** staggered hero reveal, the rising-bubbles backdrop, the live physics flasks, scroll-driven section reveals (Motion), premium hover micro-interactions on project cards and the theme toggle. All gated by `prefers-reduced-motion`.
- **Color tokens:** CSS variables in `globals.css`, light in `:root`, dark under `[data-theme='dark']`, mirroring beatloops' token set (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, etc.). Flask liquid colors live in the physics layer, not the token set.

## 4. Architecture & tech stack

Fresh Next.js (App Router) app aligned with beatloops' versions for pattern reuse:

- **Next.js 16 (App Router) + React 19 + TypeScript (strict).**
- **Tailwind CSS 4** + PostCSS + CSS-variable tokens; `cn()` helper (`clsx` + `tailwind-merge`); `class-variance-authority` for button/card variants.
- **Zustand 5** with `persist` for theme + flags; `data-theme` attribute on `<html>` + inline anti-flash script + **View Transitions API** toggle (port beatloops' `theme-toggler` primitive + button).
- **Motion (Framer)** for animation.
- **matter-js 0.20** for physics (ported from the POC).
- **Resend + react-email** for the contact form (server action / route handler; recipient in `RESEND_TO` env var; API key in `RESEND_API_KEY`). Placeholder env values; nothing displayed on the page.
- **i18n:** `[lang]` segment, `en` + `de`, JSON dictionaries, `generateStaticParams`, middleware for locale negotiation (beatloops pattern, trimmed to 2 locales).
- **Icons:** `lucide-react`. **Path alias:** `@/*`.

### 4.1 Location & project structure

New app at **`webportfolio/web/`** (sibling to `flask-physics-poc/` and old `src/`, same git repo; nothing deleted).

```
web/
├── src/
│   ├── app/
│   │   └── [lang]/
│   │       ├── layout.tsx            # providers, fonts, anti-flash script, Header/Footer
│   │       ├── page.tsx              # the single scrollable page (sections composed here)
│   │       ├── settings/page.tsx     # diagnostics + theme/loader controls
│   │       ├── not-found.tsx
│   │       └── api|actions/contact   # Resend server action / route
│   ├── components/
│   │   ├── layout/                   # Header (fullscreen menu), Footer, LoadingScreen, PageTransitionProvider
│   │   ├── sections/                 # Hero, About, Skills, Projects, Contact
│   │   ├── physics/                  # ported POC: PhysicsScene, FlaskChain, FlaskSVG, ChainLinkSVG (client island)
│   │   ├── theme/                    # ThemeToggler primitive + button, AppStateProvider
│   │   ├── bubbles/                  # BubblesBackdrop (inlined animated SVG, theme-aware)
│   │   └── ui/                       # shared primitives (Button, Card, etc.)
│   ├── physics/                      # constants, createChainBodies, createFlaskBody (ported)
│   ├── hooks/                        # usePhysicsEngine, useAnimationSync, useMousePhysics (ported)
│   ├── store/useAppStore.ts          # Zustand theme + flags + deviceInfo
│   ├── i18n/                         # config, dictionary loader, dictionaries/{en,de}.json
│   ├── data/                         # skills.json, projects.json, profile.json
│   └── lib/utils.ts
├── public/
│   ├── fonts/                        # BerlinType woff2 (regular + bold)
│   ├── skills/                       # skill icon svgs (from POC public/skills)
│   ├── img/                          # pic.webp, secret.webp, icons (from old src/img)
│   └── svg/                          # github.svg etc.
├── middleware.ts                     # locale routing
├── next.config.ts, tailwind/postcss, tsconfig.json, package.json
```

## 5. The single scrollable page (per `[lang]`)

Composed in `app/[lang]/page.tsx`; chrome (Header/Footer/Loader/transitions) in the layout.

1. **Loader / LoadingScreen** — "NS" mark; shown once per session (Zustand `hasShownLoader`), beatloops pattern.
2. **Hero** — `Hello World, I'm` + **Noel Studer** in giant BerlinType, scroll cue. The **bubbles backdrop** begins here and continues seamlessly behind the upper page for a continuous, integrated feel.
3. **About / Me** — profile picture (`pic.webp`) + short bio + the five skill columns (Coding & Frameworks, Software, OS, Languages, Other Interests), content carried over and rewritten for Noel.
4. **Skills** — the **animated bubbles SVG** as backdrop, the **skills overview** connected on top, and **directly beneath it the live Matter.js flask physics**: hanging flasks on chains, each holding a skill icon, replacing the old static `pc/tablet/mobile-tra.webp`. Responsive flask counts (~40 desktop / ~18 mobile), seamless and interactive (mouse drag + scroll impulse).
5. **Projects** — 8 gradient cards + the hidden "secret" card (`secret.webp`), keeping `github.com/FireNick44/…` links.
6. **Contact** — Resend/react-email form: name · email · message → server action → `RESEND_TO`. Inline validation, success/error states, honeypot + basic rate limit. **No email or phone displayed anywhere.**
7. **Footer** — "Noel Studer 2026" + GitHub icon link.

Separate route: **`/settings`** — beatloops-style device/display/input/preference/hardware diagnostics, theme toggle, and a "show loader again" control.

## 6. Physics integration (porting the POC)

- Move POC components/hooks/physics into `web/src/components/physics`, `web/src/hooks`, `web/src/physics` largely verbatim.
- Wrap the scene in a **`'use client'` island** and load it via `next/dynamic` with **`ssr: false`** to avoid SSR/hydration issues from `window`/`document`/RAF.
- Guard all browser-API access; start RAF/listeners in `useEffect`; clean up on unmount (engine, RAF, listeners, ResizeObserver).
- Improvement during port: prefer a **single shared RAF** driving engine + DOM sync over per-instance RAF loops where practical; respect `prefers-reduced-motion` (static fallback / paused engine).
- Skills data continues from `data/skills.json` + `public/skills/*.svg`; flasks on layers 0/1 carry icons (layer 2 static), seeded layout preserved.
- "Minimizing/maximizing logic": flask count, segment count, and effects scale by viewport/device; mobile uses the reduced configuration.

## 7. Bubbles backdrop

- Port `src/svg/intro-bg.svg` as an **inlined React SVG component** (`BubblesBackdrop`) so its SMIL `animate`/`animateTransform` nodes actually run (they do not when used as a CSS `background-image`, which is how the old site embedded it).
- Make the gradient stops theme-aware via CSS variables; position fixed/absolute behind hero→skills; `pointer-events: none`; honor reduced-motion.

## 8. Theme system

Port beatloops' approach: Zustand `theme` persisted to localStorage; `AppStateProvider` syncs `<html data-theme>`; inline script in layout sets the attribute before hydration (anti-flash); `ThemeToggler` uses `document.startViewTransition` with graceful fallback; Tailwind `dark:` variant bound to `[data-theme='dark']`.

## 9. Content & data changes

- **Name:** every occurrence of "Yannic Studer"/"Yannic" → "Noel Studer"/"Noel" (titles, metadata, hero, footer, manifest, OG/Twitter tags).
- **Remove:** `yannic.studer@protonmail.com` and `+41 78 775 39 78` from all displayed/markup locations; contact is form-only.
- **Metadata/SEO:** App Router `metadata` per locale; new title/description/OG/Twitter for Noel Studer; favicon/manifest updated.
- **Data files:** `projects.json` (8 + secret, FireNick44 links), `skills.json` (from POC), `profile.json` (bio + skill columns). DE translations in dictionaries.

## 10. Assets to migrate

- Fonts: `BerlinTypeWeb-Regular.woff2`, `BerlinTypeWeb-Bold.woff2` → `public/fonts` (via `next/font/local`).
- Images: `pic.webp`, `secret.webp`, app icons/favicon → `public/img`.
- SVGs: `intro-bg.svg` (inlined component), `github.svg`, skill icons (from POC `public/skills`).

## 11. Responsive, performance, accessibility

- Mobile-first; physics + bubbles scale down on small/low-power devices; `prefers-reduced-motion` disables/pauses heavy motion.
- Lazy/dynamic-load the physics island; keep main-thread work bounded; cleanup on unmount.
- Semantic landmarks, keyboard-navigable nav/menu/toggle/form, visible focus, alt text, labelled form fields.

## 12. Verification

- App builds (`next build`) and runs; no SSR crashes from physics.
- Theme toggle persists + no flash; View Transitions degrade gracefully.
- Physics renders and is interactive on desktop and mobile breakpoints; reduced-motion fallback works.
- Bubbles animate (SMIL running) and are theme-aware.
- Contact form posts and Resend send path works with env vars set (placeholder otherwise); no email/phone present anywhere (grep clean).
- Name change complete (grep for "Yannic" returns nothing in `web/`).
- EN and DE routes render.

## 13. Defaults assumed (no further questions needed)

Carry over existing projects/bio (translated to DE); keep `FireNick44` GitHub links; reuse BerlinType; dark default; align Next/Tailwind versions with beatloops; bubbles backdrop spans hero→skills for continuity; font pairing defaults Hanken Grotesk (body) + JetBrains Mono (labels), adjustable during build.

## 14. Open items to confirm at spec review

- Body/mono font pairing (defaults above) — keep or change?
- Hero treatment: bubbles continuous behind hero→skills (proposed) vs. bubbles only in Skills section?
- Any new GitHub handle for Noel, or keep `FireNick44`?
