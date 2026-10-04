// One requestAnimationFrame for the whole reef scene.
//
// Before this, each creature (Rook, Crab, Octopus, Kelp x2, WaterCanvas) ran
// its own rAF loop and measured the scene's bounding rect every frame. Six
// callbacks per frame, each doing a layout read AFTER the previous callback's
// style writes, so the browser had to re-resolve style/layout between them.
// Here the scene rect is measured ONCE per frame, then every subscriber runs
// its update + writes. The loop starts on the first subscribe and stops on the
// last unsubscribe, so an unmounted/inactive scene costs nothing.

export interface SceneFrame {
  /** rAF timestamp (ms). */
  now: number;
  /** ms since the previous frame, clamped to MAX_DT (0 on the first frame). */
  dtMs: number;
  /** Scene container size (CSS px), measured once for this frame. */
  width: number;
  height: number;
}
export type SceneFrameFn = (f: SceneFrame) => void;

export interface SceneLoopDeps {
  schedule: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
}

/** Anything with a bounding rect — the scene container element. */
export interface SceneTarget {
  getBoundingClientRect: () => { width: number; height: number };
}
/** Used until `setTarget` has been called (never on a mounted scene). */
const FALLBACK = { width: 1000, height: 800 };

/** Longest frame we integrate over — a tab switch shouldn't teleport things. */
export const MAX_DT = 50;

export function createSceneLoop(deps: SceneLoopDeps) {
  const subs = new Set<SceneFrameFn>();
  let raf = 0;
  let last = -1;
  let running = false;
  let target: SceneTarget | null = null;

  const tick = (t: number) => {
    const dtMs = last < 0 ? 0 : Math.min(t - last, MAX_DT);
    last = t;
    const m = target ? target.getBoundingClientRect() : FALLBACK;
    const frame: SceneFrame = { now: t, dtMs, width: m.width, height: m.height };
    for (const fn of subs) fn(frame);
    if (running) raf = deps.schedule(tick);
  };

  return {
    /** The element whose size is measured once per frame (set from an effect). */
    setTarget(el: SceneTarget | null) {
      target = el;
    },
    /** Subscribe a per-frame update. Returns the unsubscribe function. */
    subscribe(fn: SceneFrameFn) {
      subs.add(fn);
      if (!running) {
        running = true;
        last = -1;
        raf = deps.schedule(tick);
      }
      return () => {
        subs.delete(fn);
        if (subs.size === 0 && running) {
          running = false;
          deps.cancel(raf);
        }
      };
    },
    get size() {
      return subs.size;
    },
    get running() {
      return running;
    },
  };
}
export type SceneLoop = ReturnType<typeof createSceneLoop>;
