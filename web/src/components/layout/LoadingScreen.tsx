"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Y_PATH, S_PATH } from "./Monogram";

// How long the overlay stays before hiding. MIN lets the line-draw → fill effect
// actually play; MAX is a hard cap so a hung font load can never trap the user
// behind the full-screen overlay. A pure-CSS failsafe (globals.css .boot-loader
// `boot-vanish`) also fades it out even if JS never runs.
const MIN_VISIBLE = 2000;
const MAX_VISIBLE = 3500;
// Replay duration (shuffle-triggered). Shorter than the boot pass — fonts are
// already loaded by then; the overlay just covers the page during the theme
// swap so the user sees a clean colour transition rather than an in-place flash.
const REPLAY_VISIBLE = 1400;

export default function LoadingScreen() {
  const setHasShownLoader = useAppStore((s) => s.setHasShownLoader);
  const loaderShowRequest = useAppStore((s) => s.loaderShowRequest);
  // Visible by default so the overlay is in the FIRST (server-rendered) paint and
  // covers the page — no Hero/blue flash before hydration. Initial state is the
  // same server & client to avoid a hydration mismatch; we only ever hide it.
  const [hidden, setHidden] = useState(false);
  // Bump on every show so the SVG line-draw/fill animations remount and replay
  // instead of staying at their `forwards` end state from the previous show.
  const [showKey, setShowKey] = useState(0);

  useEffect(() => {
    // Already shown this session (e.g. another component flipped it) → skip.
    if (useAppStore.getState().hasShownLoader) {
      setHidden(true);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setHidden(true);
      setHasShownLoader(true);
    };
    // Real readiness: web fonts loaded (no reflow under the loader) + a minimum
    // on-screen time so the line-draw/fill plays. Hard cap so it can never stick.
    const fonts =
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready
        : Promise.resolve();
    const minTime = new Promise<void>((r) => setTimeout(r, MIN_VISIBLE));
    Promise.all([fonts, minTime]).then(finish);
    const cap = setTimeout(finish, MAX_VISIBLE);
    return () => clearTimeout(cap);
  }, [setHasShownLoader]);

  // Replay: shuffle (or any caller) bumps loaderShowRequest → we re-show the
  // overlay for REPLAY_VISIBLE ms then hide it. The showKey bump remounts the
  // SVG so the line-draw plays again; the overlay's bg-background picks up the
  // newly-swapped theme automatically (CSS var), which is the whole point — the
  // user sees a clean themed flash instead of an in-place repaint.
  useEffect(() => {
    if (loaderShowRequest === 0) return; // no replays yet
    setShowKey((k) => k + 1);
    setHidden(false);
    const t = setTimeout(() => setHidden(true), REPLAY_VISIBLE);
    return () => clearTimeout(t);
  }, [loaderShowRequest]);

  return (
    <div
      aria-hidden
      data-hidden={hidden ? "true" : undefined}
      // Theme-aware border frame (white in dark, black in light), like the 2024 loader.
      style={{ border: "clamp(8px, 1.4vw, 16px) solid var(--foreground)" }}
      className="boot-loader fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-9 bg-background"
    >
      <svg
        key={showKey}
        className="boot-logo w-[clamp(120px,22vw,210px)]"
        viewBox="0 0 105 80"
        role="img"
        aria-label="Yannic Studer"
      >
        <path pathLength={1} d={Y_PATH} transform="translate(5 10)" />
        <path pathLength={1} d={S_PATH} transform="translate(55 9)" />
        <circle className="boot-dot" cx="101" cy="71" r="2.6" />
      </svg>

      <span className="font-mono text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground/70">
        calibrating workspace
      </span>
    </div>
  );
}
