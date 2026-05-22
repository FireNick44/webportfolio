export type SyncFn = () => void;
export interface FrameLoopDeps {
  update: (deltaMs: number) => void;
  schedule: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
}
const FIXED = 1000 / 60;
const MAX_FRAME = 100;
const MAX_STEPS = 5;

export function createFrameLoop(deps: FrameLoopDeps) {
  const subs = new Map<string, SyncFn>();
  let raf = 0, last = -1, acc = 0, running = false;
  const tick = (t: number) => {
    if (last >= 0) {
      acc += Math.min(t - last, MAX_FRAME);
      let steps = 0;
      while (acc >= FIXED && steps < MAX_STEPS) { deps.update(FIXED); acc -= FIXED; steps++; }
      if (steps === MAX_STEPS) acc = 0;
      if (steps > 0) for (const fn of subs.values()) fn();
    }
    last = t;
    raf = deps.schedule(tick);
  };
  return {
    subscribe(id: string, fn: SyncFn) { subs.set(id, fn); return () => { subs.delete(id); }; },
    start() { if (running) return; running = true; last = -1; acc = 0; raf = deps.schedule(tick); },
    stop() { running = false; deps.cancel(raf); },
  };
}
export type FrameLoop = ReturnType<typeof createFrameLoop>;
