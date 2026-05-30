import Matter from "matter-js";

import { CAT_MOUSE, CAT_WALL } from "./constants";

// "Collide" interaction mode: a small static body follows the cursor and pushes
// flasks/chains around (no grab). The body is parked off-screen until the
// cursor moves into the rack. Static + setPosition each frame makes other
// bodies feel a solid moving obstacle; a collisionStart listener adds momentum
// from the recent cursor velocity so a fast sweep imparts real motion instead
// of static-teleport flicker.

// Momentum transfer multipliers — sideways gets more push so flasks swing
// laterally; the engine's afterUpdate speed cap (in usePhysicsEngine) catches
// any extreme value the solver wouldn't like.
const PUSH_X = 0.85;
const PUSH_Y = 0.35;
// Cursor speed (Matter units = px / 16.67ms step) below which we skip the
// push (no real motion → no zap of idle flasks).
const MIN_VEL_FOR_PUSH = 0.3;

export interface CursorPusher {
  /** Create or remove the pusher body (responds to interaction-mode flips). */
  setActive(active: boolean): void;
  /** Record a real pointermove + re-sync the body. */
  recordPointerMove(clientX: number, clientY: number, timeMs: number): void;
  /** Re-sync from the last-known viewport cursor (called on scroll, since the
   *  rack is sticky and its rect can shift under a stationary cursor). */
  syncFromScroll(timeMs: number): void;
  /** Tear down the body + the collisionStart listener. */
  dispose(): void;
}

export function createCursorPusher(
  engine: Matter.Engine,
  getContainerRect: () => DOMRect,
): CursorPusher {
  let body: Matter.Body | null = null;
  let lastClient = { x: 0, y: 0 };
  let lastVel = { x: 0, y: 0 };
  let lastTime = 0;

  /** Recompute the cursor body's container-local position from the last-known
   *  viewport-cursor pos, gating out the top + bottom wave bands (where the
   *  visible affordance is dressed up as decoration, not interaction). */
  const sync = (timeMs: number) => {
    if (!body) return;
    const rect = getContainerRect();
    const { x: cx, y: cy } = lastClient;
    const waveH = Math.max(56, Math.min(130, 0.08 * window.innerWidth));
    const active =
      cx >= rect.left &&
      cx <= rect.right &&
      cy >= rect.top + waveH &&
      cy <= rect.bottom - waveH;
    if (active) {
      const cur = { x: cx - rect.left, y: cy - rect.top };
      const dt =
        lastTime > 0 ? Math.max(1, timeMs - lastTime) : 1000 / 60;
      lastVel = {
        x: ((cur.x - body.position.x) / dt) * (1000 / 60),
        y: ((cur.y - body.position.y) / dt) * (1000 / 60),
      };
      lastTime = timeMs;
      Matter.Body.setPosition(body, cur);
    } else {
      Matter.Body.setPosition(body, { x: -9999, y: -9999 });
      lastVel = { x: 0, y: 0 };
      lastTime = 0;
    }
  };

  const ensure = () => {
    if (body) return;
    body = Matter.Bodies.circle(-9999, -9999, 24, {
      isStatic: true,
      collisionFilter: {
        // CAT_MOUSE so flasks (whose mask already includes CAT_MOUSE) get
        // pushed; walls (mask CAT_LAYER only) are unaffected.
        category: CAT_MOUSE,
        mask: 0xffff & ~CAT_WALL,
        group: 0,
      },
      label: "cursor-pusher",
    });
    Matter.Composite.add(engine.world, body);
  };

  const remove = () => {
    if (!body) return;
    Matter.Composite.remove(engine.world, body);
    body = null;
  };

  const onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
    if (!body) return;
    const v = lastVel;
    if (Math.hypot(v.x, v.y) < MIN_VEL_FOR_PUSH) return;
    for (const pair of event.pairs) {
      const other =
        pair.bodyA === body
          ? pair.bodyB
          : pair.bodyB === body
            ? pair.bodyA
            : null;
      if (!other || other.isStatic || other.label !== "flask") continue;
      Matter.Sleeping.set(other, false);
      Matter.Body.setVelocity(other, {
        x: other.velocity.x + v.x * PUSH_X,
        y: other.velocity.y + v.y * PUSH_Y,
      });
    }
  };
  Matter.Events.on(engine, "collisionStart", onCollisionStart);

  return {
    setActive(active) {
      if (active) ensure();
      else remove();
    },
    recordPointerMove(clientX, clientY, timeMs) {
      lastClient = { x: clientX, y: clientY };
      sync(timeMs);
    },
    syncFromScroll(timeMs) {
      sync(timeMs);
    },
    dispose() {
      Matter.Events.off(engine, "collisionStart", onCollisionStart);
      remove();
    },
  };
}
