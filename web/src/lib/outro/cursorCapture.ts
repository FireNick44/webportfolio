/**
 * Per-frame coordination so the octopus can briefly "grab" the custom cursor.
 *  - held:  the octopus is dragging the cursor (pinned to x,y); on release the
 *           SceneCursor springs it back to the user's real pointer.
 *  - x,y:   viewport coords to pin to while held.
 *
 * We never relocate the cursor persistently: the native OS cursor position can't
 * be set from a web page, so the grab is only ever a temporary borrow.
 */
export const cursorCapture = {
  held: false,
  x: 0,
  y: 0,
};
