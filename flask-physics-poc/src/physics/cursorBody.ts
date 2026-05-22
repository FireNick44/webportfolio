import Matter from "matter-js";
import { MOUSE_BODY_RADIUS, CAT_MOUSE, MOUSE_MASK } from "./constants";

/**
 * A small cursor body that follows the pointer. It is a SENSOR: it detects
 * contact with flasks (firing collisionStart) but never physically pushes them
 * — a solid body would re-apply contact every step, defeating the shake
 * cooldown and keeping flasks awake forever. Collision filtering reuses the
 * dormant CAT_MOUSE / MOUSE_MASK scaffolding (front bands only).
 */
export function createCursorBody(): Matter.Body {
  return Matter.Bodies.circle(-1000, -1000, MOUSE_BODY_RADIUS, {
    isStatic: true,
    isSensor: true,
    collisionFilter: { category: CAT_MOUSE, mask: MOUSE_MASK },
    label: "cursor",
  });
}
