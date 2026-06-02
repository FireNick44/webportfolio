import { flushSync } from "react-dom";

import { useAppStore, type ThemeMode } from "@/lib/store/useAppStore";

import { applyTokenOverrides } from "./applyTokenOverrides";
import { shuffleTheme } from "./shuffleTheme";

export type Direction = "btt" | "ttb" | "ltr" | "rtl";

/** Query param carrying the random-theme seed (base36). Shareable: pasting the
 *  URL re-applies the exact generated look on load. */
export const SHUFFLE_PARAM = "shuffle";

/** Resolve the OS colour-scheme preference for "device" mode. */
export function resolveDeviceScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Drop the `?shuffle=…` query param (and legacy `#shuffle` hash) without a
 *  navigation — called when leaving the random theme, otherwise the URL would
 *  still advertise a seed and re-apply it on the next load. */
export function stripShuffleParam() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const hadHash = url.hash.startsWith("#shuffle");
  if (!url.searchParams.has(SHUFFLE_PARAM) && !hadHash) return;
  url.searchParams.delete(SHUFFLE_PARAM);
  if (hadHash) url.hash = "";
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}

/** Apply a user theme choice. "light"/"dark" pin the scheme, "device" follows
 *  the OS, "random" generates a fresh palette (delegates to shuffleTheme, which
 *  also writes the shareable `?shuffle=` seed). The non-random branches are the
 *  "escape hatch" back to the clean Lab palette: clear any preset + inline token
 *  overrides and strip the seed param, or those would mask the scheme flip. */
export function applyThemeMode(mode: ThemeMode) {
  const store = useAppStore.getState();
  if (mode === "random") {
    shuffleTheme();
    return;
  }
  const resolved = mode === "device" ? resolveDeviceScheme() : mode;
  store.setThemeMode(mode);
  store.setPreset(null);
  store.clearTokenOverrides();
  // Strip inline vars now (not just via the provider effect) so a view-transition
  // snapshot taken this frame already shows the clean palette.
  applyTokenOverrides({});
  // Flip data-theme synchronously too: inside runThemeTransition's flushSync the
  // VT snapshot is captured this frame, but the store→effect that normally sets
  // the attribute is async, so the snapshot would otherwise freeze the OLD
  // scheme and the wipe would reveal it. (Idempotent with the provider effect.)
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
  }
  store.setTheme(resolved);
  stripShuffleParam();
}

function getClip(direction: Direction): [string, string] {
  switch (direction) {
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
    case "ttb":
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
    case "btt":
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
    case "ltr":
    default:
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
  }
}

/** Run `apply` inside a clip-path view-transition wipe (same look as the header
 *  light/dark toggle). Falls back to applying instantly on mobile / reduced
 *  motion / no startViewTransition. The default cross-fade is disabled globally
 *  in globals.css so only the clip wipe shows. */
export function runThemeTransition(apply: () => void, direction: Direction = "ltr") {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile =
    typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

  if (
    typeof document === "undefined" ||
    !document.startViewTransition ||
    isMobile ||
    reduce
  ) {
    apply();
    return;
  }

  const root = document.documentElement;
  root.classList.add("vt-no-transition");
  const transition = document.startViewTransition(() => {
    flushSync(apply);
  });
  transition.finished.finally(() => root.classList.remove("vt-no-transition"));
  transition.ready
    .then(() => {
      const [from, to] = getClip(direction);
      root.animate(
        { clipPath: [from, to] },
        {
          duration: 650,
          easing: "cubic-bezier(0.76, 0, 0.24, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}
