"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { createFrameLoop, type FrameLoop } from "@/physics/frameLoop";

/** One rAF drives Engine.update (fixed timestep) then every registered flask
 *  sync. Two independent gates:
 *   - `active`  — whether the rAF tick runs at all (off-screen / tier=off etc).
 *   - `enginePlaying` — whether Matter.Engine.update is actually invoked. When
 *      false the rAF still ticks and subscribers still fire so flask wrappers
 *      get their initial transforms written from body.position (the rack stays
 *      visible and correctly placed), but no solver steps run so bodies don't
 *      animate. Used by the click-to-activate overlay: rack renders frozen at
 *      spawn until the user clicks, then physics kicks in.
 */
export function useFrameLoop(
  engine: Matter.Engine,
  active: boolean,
  enginePlaying: boolean = true,
): FrameLoop {
  // Read inside the closure so the gate is always current even though createFrameLoop
  // captures `update` once. Updated each render below.
  const playingRef = useRef(enginePlaying);
  playingRef.current = enginePlaying;
  const [loop] = useState(() =>
    createFrameLoop({
      update: (dt) => {
        if (!playingRef.current) return; // syncDom still runs (frameLoop counts steps); engine frozen
        Matter.Engine.update(engine, dt);
      },
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
