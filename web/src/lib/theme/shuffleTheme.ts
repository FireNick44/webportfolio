"use client";

import { useAppStore } from "@/lib/store/useAppStore";

import { applyTokenOverrides } from "./applyTokenOverrides";
import { randomTheme } from "./randomTheme";

/** Apply a generated theme (harmony palette, WCAG-guarded contrast, per-section
 *  accents, vivid flask palette) + reshuffle the flask layout in place. With a
 *  `seed` it's deterministic (shareable); without, a fresh random one. Writes
 *  the seed to the `?shuffle=` query param so the exact look can be copied and
 *  shared. This is the "random" theme mode (see applyThemeMode / ThemeModeSwitch). */
export function shuffleTheme(seed?: number) {
  if (typeof window === "undefined") return;
  const store = useAppStore.getState();
  const { scheme, tokens, seed: usedSeed } = randomTheme(seed);
  store.setThemeMode("random"); // keep the theme switch's highlight in sync
  store.setPreset(null); // bespoke generated theme — not a named preset
  store.setTheme(scheme);
  store.setTokenOverrides(tokens);
  applyTokenOverrides(tokens);
  store.setRandomizeFlaskShapes(true);
  store.bumpFlaskShuffleCounter();
  // Shareable seed in the `?shuffle=` query param (base36). replaceState so it
  // doesn't spam history on repeated rolls; drop any legacy `#shuffle` hash.
  const url = new URL(window.location.href);
  url.searchParams.set("shuffle", usedSeed.toString(36));
  if (url.hash.startsWith("#shuffle")) url.hash = "";
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
