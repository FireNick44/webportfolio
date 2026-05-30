// Names of the CSS custom properties the design-token system controls.
// Single source of truth for both the editor (TechnicalPanel) and the
// runtime applier (applyTokenOverrides).

/** Every base token the editor + presets manage. Order = display order. */
export const TOKEN_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--destructive",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];
export type TokenMap = Partial<Record<TokenName, string>>;

/** The flask water palette vars (set by `randomTheme`, otherwise from
 *  globals.css per theme). Applied alongside TOKEN_NAMES so a shuffle
 *  recolours the water too. */
export const FLASK_VAR_NAMES = Array.from(
  { length: 8 },
  (_, i) => `--flask-c${i}`,
);

/** The 5 colour bands behind the flask rack (FlaskBackdrop). Same shuffle
 *  cycle as the flask water so the section reads as one theme. Defaults
 *  live in globals.css per scheme; `randomTheme` overwrites them with a
 *  hue family derived from the run's base hue. */
export const SKILLS_BG_VARS = Array.from(
  { length: 5 },
  (_, i) => `--skills-bg-${i}`,
);

/** Per-section accent vars. globals.css maps each section's local
 *  `--accent` to these (with an `inherit` fallback so a section reverts
 *  to the base accent when its var is unset — i.e. on the default
 *  light/dark themes). Only a shuffled/custom theme sets them. */
export const SECTION_KEYS = [
  "me",
  "skills",
  "projects",
  "contact",
  "footer",
] as const;
export const SECTION_ACCENT_VARS = SECTION_KEYS.map((k) => `--accent-${k}`);
