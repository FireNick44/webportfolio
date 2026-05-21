import { useEffect, useRef } from "react";
import Matter from "matter-js";

export function usePhysicsEngine() {
  const engineRef = useRef<Matter.Engine | null>(null);

  if (!engineRef.current) {
    const engine = Matter.Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: 1, scale: 0.001 },
    });
    // Higher iterations = more stable constraints, less springy behavior
    engine.positionIterations = 10;
    engine.velocityIterations = 8;
    engine.constraintIterations = 4;
    engineRef.current = engine;
  }

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        Matter.Engine.clear(engineRef.current);
        engineRef.current = null;
      }
    };
  }, []);

  return engineRef.current;
}
