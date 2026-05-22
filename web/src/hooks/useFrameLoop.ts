"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Matter from "matter-js";
import { createFrameLoop, type FrameLoop } from "@/physics/frameLoop";

/** One rAF drives Engine.update (fixed timestep) then every registered flask sync. */
export function useFrameLoop(engine: Matter.Engine, active: boolean): FrameLoop {
  const [loop] = useState(() =>
    createFrameLoop({
      update: (dt) => Matter.Engine.update(engine, dt),
      schedule: (cb) => requestAnimationFrame(cb),
      cancel: (id) => cancelAnimationFrame(id),
    })
  );
  useEffect(() => {
    if (active) loop.start();
    else loop.stop();
    return () => loop.stop();
  }, [loop, active]);
  return loop;
}

export const FrameLoopContext = createContext<FrameLoop | null>(null);
export function useFrameLoopContext(): FrameLoop | null {
  return useContext(FrameLoopContext);
}
