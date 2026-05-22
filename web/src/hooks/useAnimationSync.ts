import { useEffect, useRef } from "react";
import Matter from "matter-js";

// Matter integrates most stably with a CONSTANT timestep. Feeding it the raw
// frame delta (which varies frame-to-frame and spikes well past 16.667ms on any
// dropped frame) makes the simulation jittery and trips Matter's
// "delta argument is recommended to be <= 16.667ms" warning.
//
// Instead we accumulate real elapsed time and advance the engine in fixed
// 1/60s steps. This gives deterministic, smooth motion, never exceeds the
// recommended delta (so no warning), and runs at the correct real-time speed on
// any refresh rate — a 120Hz/ProMotion display simply runs ~one step every two
// rendered frames.
const FIXED_DELTA = 1000 / 60; // 16.667ms — Matter's recommended max delta
const MAX_FRAME = 100; // clamp long gaps (tab switch / stall) before accumulating
const MAX_STEPS = 5; // cap catch-up steps per frame so we never spiral

export function useAnimationSync(engine: Matter.Engine, active: boolean = true) {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    let last = 0;
    let accumulator = 0;

    const step = (timestamp: number) => {
      if (last) {
        accumulator += Math.min(timestamp - last, MAX_FRAME);
        let steps = 0;
        while (accumulator >= FIXED_DELTA && steps < MAX_STEPS) {
          Matter.Engine.update(engine, FIXED_DELTA);
          accumulator -= FIXED_DELTA;
          steps++;
        }
        // Hit the catch-up cap → drop the backlog so the sim doesn't
        // fast-forward after a long stall.
        if (steps === MAX_STEPS) accumulator = 0;
      }
      last = timestamp;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [engine, active]);
}
