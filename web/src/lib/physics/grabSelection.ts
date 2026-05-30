import Matter from "matter-js";

// How near a press must land to grab a flask/chain when it doesn't land
// directly on one.
export const GRAB_RADIUS = 56;

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
