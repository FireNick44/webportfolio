import { useEffect, useRef } from "react";
import Matter from "matter-js";

export function useAnimationSync(engine: Matter.Engine) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const step = (timestamp: number) => {
      if (lastTimeRef.current) {
        const delta = timestamp - lastTimeRef.current;
        // Clamp delta to avoid spiral of death on tab switch
        Matter.Engine.update(engine, Math.min(delta, 32));
      }
      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [engine]);
}
