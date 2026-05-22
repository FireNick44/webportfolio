export type SyncFn = () => void;

export interface LoopDeps {
  /** True if any dynamic (non-static, non-sleeping) body is awake. */
  anyAwake: () => boolean;
  /** Current time in ms (performance.now in production). */
  now: () => number;
  /** Schedule the next frame; returns a cancellable id (requestAnimationFrame). */
  schedule: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
  /** Advance the physics engine by deltaMs (Matter.Engine.update wrapper). */
  update: (deltaMs: number) => void;
  /** How long a wake() keeps the loop alive with nothing awake. */
  wakeMs: number;
}

export interface FlaskFieldLoop {
  register: (id: string, fn: SyncFn) => void;
  unregister: (id: string) => void;
  wake: () => void;
  stop: () => void;
}

/**
 * One loop drives BOTH the physics update and every registered DOM-sync fn.
 * When no dynamic body is awake and the wake window has expired, it suspends
 * (stops scheduling) — idle = zero work. Any wake() resumes it for wakeMs.
 *
 * Pure and dependency-injected so the suspend/resume/registry logic is unit
 * testable without React, real rAF, or a real physics engine.
 */
export function createFlaskFieldLoop(deps: LoopDeps): FlaskFieldLoop {
  const syncs = new Map<string, SyncFn>();
  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let wakeUntil = 0;

  const tick = (now: number) => {
    if (lastTime) deps.update(Math.min(now - lastTime, 32));
    lastTime = now;

    for (const fn of syncs.values()) fn();

    const keepAlive = deps.anyAwake() || now < wakeUntil;
    if (keepAlive) {
      rafId = deps.schedule(tick);
    } else {
      running = false;
      lastTime = 0; // reset delta baseline so the next resume doesn't jump
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    rafId = deps.schedule(tick);
  };

  return {
    register(id, fn) {
      syncs.set(id, fn);
      wakeUntil = deps.now() + deps.wakeMs;
      start();
    },
    unregister(id) {
      syncs.delete(id);
    },
    wake() {
      wakeUntil = deps.now() + deps.wakeMs;
      start();
    },
    stop() {
      deps.cancel(rafId);
      running = false;
    },
  };
}
