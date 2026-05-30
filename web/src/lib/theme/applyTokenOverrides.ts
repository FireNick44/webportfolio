import {
  FLASK_VAR_NAMES,
  SECTION_ACCENT_VARS,
  SKILLS_BG_VARS,
  TOKEN_NAMES,
} from "./tokenNames";

/** Reconcile inline token overrides on <html>: set the ones present, remove
 *  the rest. Idempotent — safe to call on every change. Theme tokens AND the
 *  flask palette + backdrop bands + per-section accents are all swept so a
 *  switch from a random theme back to a preset drops the random colours and
 *  falls back to the globals.css per-theme defaults. */
export function applyTokenOverrides(overrides: Record<string, string>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const name of [
    ...TOKEN_NAMES,
    ...FLASK_VAR_NAMES,
    ...SECTION_ACCENT_VARS,
    ...SKILLS_BG_VARS,
  ]) {
    const v = overrides[name];
    if (v) root.style.setProperty(name, v);
    else root.style.removeProperty(name);
  }
}
