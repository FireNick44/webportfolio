import Matter from "matter-js";
import { useEffect, useState } from "react";

export function usePhysicsEngine() {
  // Lazy init via useState so the engine is created exactly once without
  // touching a ref during render (which the react-compiler lint flags).
  const [engine] = useState(() => {
    const e = Matter.Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: 1, scale: 0.001 },
    });
    // Higher iterations = more stable constraints, less springy behavior.
    // 6 is the sweet spot now: the drag-target maxReach clamp already caps
    // overstretch at the source, so we don't need the heavy 10-iter solver
    // pass each step (that was causing visible spikes on far drags).
    e.positionIterations = 10;
    e.velocityIterations = 8;
    e.constraintIterations = 6;

    // Safety net: hard-cap per-step linear AND angular speed so a stretched or
    // yanked chain can't blow up into runaway flicker — the angular cap is what
    // stops each link spinning wildly around its own centre. Also lets residual
    // energy decay below the sleep threshold instead of jittering forever. Both
    // caps sit well above any normal swing/drag, so they only catch explosions.
    const MAX_BODY_SPEED = 45;
    const MAX_ANGULAR_SPEED = 0.5; // rad per step
    Matter.Events.on(e, "afterUpdate", () => {
      for (const b of Matter.Composite.allBodies(e.world)) {
        if (b.isStatic || b.isSleeping) continue;
        const { x, y } = b.velocity;
        const sp = Math.hypot(x, y);
        if (sp > MAX_BODY_SPEED) {
          const k = MAX_BODY_SPEED / sp;
          Matter.Body.setVelocity(b, { x: x * k, y: y * k });
        }
        if (b.angularVelocity > MAX_ANGULAR_SPEED) {
          Matter.Body.setAngularVelocity(b, MAX_ANGULAR_SPEED);
        } else if (b.angularVelocity < -MAX_ANGULAR_SPEED) {
          Matter.Body.setAngularVelocity(b, -MAX_ANGULAR_SPEED);
        }
      }
    });
    return e;
  });

  useEffect(() => {
    return () => {
      Matter.Engine.clear(engine);
    };
  }, [engine]);

  return engine;
}
