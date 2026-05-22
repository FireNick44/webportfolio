import { createContext, useContext, useEffect, useState } from "react";
import Matter from "matter-js";
import {
  createFlaskFieldLoop,
  type FlaskFieldLoop,
} from "../physics/flaskFieldLoop";

/**
 * Wires the pure loop core to React + the real engine: one rAF drives the
 * engine update and all registered flask DOM syncs, suspending when idle.
 */
export function useFlaskFieldLoop(
  engine: Matter.Engine,
  wakeMs: number
): FlaskFieldLoop {
  const [loop] = useState(() =>
    createFlaskFieldLoop({
      anyAwake: () =>
        Matter.Composite.allBodies(engine.world).some(
          (b) => !b.isStatic && !b.isSleeping
        ),
      now: () => performance.now(),
      schedule: (cb) => requestAnimationFrame(cb),
      cancel: (id) => cancelAnimationFrame(id),
      update: (dt) => Matter.Engine.update(engine, dt),
      wakeMs,
    })
  );

  useEffect(() => {
    loop.wake(); // kick off on mount
    return () => loop.stop();
  }, [loop]);

  return loop;
}

export const FlaskFieldLoopContext = createContext<FlaskFieldLoop | null>(null);

export function useFlaskFieldLoopContext(): FlaskFieldLoop {
  const ctx = useContext(FlaskFieldLoopContext);
  if (!ctx) {
    throw new Error(
      "useFlaskFieldLoopContext must be used within FlaskFieldLoopContext.Provider"
    );
  }
  return ctx;
}
