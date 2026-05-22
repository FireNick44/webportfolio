import { useEffect, useState } from "react";
import Matter from "matter-js";

export function usePhysicsEngine() {
  // Lazy init via useState so the engine is created exactly once without
  // touching a ref during render (which the react-compiler lint flags).
  const [engine] = useState(() => {
    const e = Matter.Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: 1, scale: 0.001 },
    });
    // Higher iterations = more stable constraints, less springy behavior
    e.positionIterations = 10;
    e.velocityIterations = 8;
    e.constraintIterations = 4;
    return e;
  });

  useEffect(() => {
    return () => {
      Matter.Engine.clear(engine);
    };
  }, [engine]);

  return engine;
}
