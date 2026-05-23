/**
 * Per-frame coordination so the octopus can "capture" and relocate the custom
 * cursor.
 *  - held:        the octopus is dragging the cursor (pinned to x,y).
 *  - x,y:         viewport coords to pin to while held.
 *  - offsetX/Y:   persistent displacement applied after a drop, so the cursor
 *                 stays where the octopus left it and tracks the mouse FROM
 *                 there (visual = realMouse + offset). Reset to 0 when the
 *                 pointer leaves the outro so it re-aligns with the real mouse.
 */
export const cursorCapture = {
  held: false,
  x: 0,
  y: 0,
  offsetX: 0,
  offsetY: 0,
};
