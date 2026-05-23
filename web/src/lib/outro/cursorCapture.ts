/**
 * Per-frame coordination so the octopus can "capture" and relocate the custom
 * cursor.
 *  - held:              the octopus is dragging the cursor (pinned to x,y).
 *  - x,y:               viewport coords to pin to while held.
 *  - baseOffsetX/Y:     the displacement the octopus applied when it dropped the
 *                       cursor (the full relocation).
 *  - offsetX/Y:         the EFFECTIVE displacement actually applied to the cursor
 *                       (visual = realMouse + offset), read by both the
 *                       SceneCursor and the Octopus. SceneCursor recomputes it
 *                       each frame by fading baseOffset toward 0 as the pointer
 *                       nears the scene edge — so the arrow converges onto the
 *                       real cursor before the native cursor takes over (no jump
 *                       at the boundary). Cleared when the pointer leaves.
 */
export const cursorCapture = {
  held: false,
  x: 0,
  y: 0,
  baseOffsetX: 0,
  baseOffsetY: 0,
  offsetX: 0,
  offsetY: 0,
};
