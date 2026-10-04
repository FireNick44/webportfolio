import Matter from "matter-js";

// How near a press must land to grab a flask/chain when it doesn't land
// directly on one.
export const GRAB_RADIUS = 56;

// Touch hit layer padding (px, flask-local, before layer scale): each physics
// flask renders an invisible `[data-flask-hit]` box this much larger than its
// Matter hitbox on every side. A finger landing on it commits to the flask
// (touch-action: none → the browser never turns that gesture into a scroll),
// so re-grabbing a bottle can't fall back to page scroll. Bigger = easier to
// catch a swinging bottle, but more of the section stops native-scrolling.
export const TOUCH_HIT_PAD = 12;

/** Drag-mode pickable: flasks and individual chain links. */
export function isGrabbable(b: Matter.Body): boolean {
  return (
    !b.isStatic &&
    (b.label === "flask" || b.label.startsWith("chain-segment-"))
  );
}

/** Find the best body to grab for a press at `pos` (container-local).
 *  Preference: direct flask hit → any direct link hit → nearest grabbable
 *  within GRAB_RADIUS, biased toward flasks. */
export function pickGrabbable(
  world: Matter.World,
  pos: { x: number; y: number },
): Matter.Body | null {
  const bodies = Matter.Composite.allBodies(world);
  const hits = Matter.Query.point(bodies, pos).filter(isGrabbable);
  const exactFlask = hits.find((b) => b.label === "flask");
  if (exactFlask) return exactFlask;
  if (hits.length) return hits[0];
  let nearest: Matter.Body | null = null;
  let nearestScore = GRAB_RADIUS;
  for (const b of bodies) {
    if (!isGrabbable(b)) continue;
    const d = Math.hypot(b.position.x - pos.x, b.position.y - pos.y);
    const score = b.label === "flask" ? d * 0.6 : d;
    if (score < nearestScore) {
      nearestScore = score;
      nearest = b;
    }
  }
  return nearest;
}
