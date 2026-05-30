"use client";

import { useAppStore } from "@/lib/store/useAppStore";

import { applyTokenOverrides } from "./applyTokenOverrides";
import { randomTheme } from "./randomTheme";

/** Apply a generated theme (harmony palette, WCAG-guarded contrast, per-section
 *  accents, vivid flask palette) + reshuffle the flask layout in place. With a
 *  `seed` it's deterministic (shareable); without, a fresh random one. Writes
 *  the seed to the URL hash so the exact look can be copied/shared. */
export function shuffleTheme(seed?: number) {
  if (typeof window === "undefined") return;
  const store = useAppStore.getState();
  const { scheme, tokens, seed: usedSeed } = randomTheme(seed);
  store.setPreset(null); // bespoke generated theme — not a named preset
  store.setTheme(scheme);
  store.setTokenOverrides(tokens);
  applyTokenOverrides(tokens);
  store.setRandomizeFlaskShapes(true);
  store.bumpFlaskShuffleCounter();
  // Shareable seed in the hash (base36). replaceState so it doesn't spam
  // history on repeated rolls.
  history.replaceState(
    null,
    "",
    `${window.location.pathname}#shuffle=${usedSeed.toString(36)}`,
  );
}

export function scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
