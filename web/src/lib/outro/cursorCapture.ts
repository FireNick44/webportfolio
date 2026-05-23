/**
 * Per-frame coordination so the octopus can "capture" the custom cursor.
 * The octopus writes its viewport position here while it holds the cursor;
 * SceneCursor pins itself there instead of following the mouse, then springs
 * back to the real mouse once released.
 */
export const cursorCapture = {
  held: false,
  x: 0,
  y: 0,
};
