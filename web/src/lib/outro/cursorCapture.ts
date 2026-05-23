/**
 * Per-frame coordination so the octopus can "capture" the custom cursor.
 *  - held:    the octopus is actively dragging the cursor (pinned to it).
 *  - dropped: the octopus let go; the cursor stays at (x,y) near a screen edge
 *             until the user moves the real mouse (then SceneCursor reclaims it).
 *  - x,y:     viewport coords to pin the cursor to while held or dropped.
 */
export const cursorCapture = {
  held: false,
  dropped: false,
  x: 0,
  y: 0,
};
