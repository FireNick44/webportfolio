import { describe, it, expect } from "vitest";
import { createFlaskFieldLoop, type LoopDeps } from "./flaskFieldLoop";

// A controllable harness: manual scheduler + clock + awake flag.
function makeHarness(opts: { awake?: boolean; wakeMs?: number } = {}) {
  let time = 0;
  let awakeFlag = opts.awake ?? false;
  const scheduled: Array<(t: number) => void> = [];
  const updates: number[] = [];

  const deps: LoopDeps = {
    anyAwake: () => awakeFlag,
    now: () => time,
    schedule: (cb) => {
      scheduled.push(cb);
      return scheduled.length;
    },
    cancel: () => {},
    update: (dt) => updates.push(dt),
    wakeMs: opts.wakeMs ?? 600,
  };

  const loop = createFlaskFieldLoop(deps);
  return {
    loop,
    updates,
    setAwake: (a: boolean) => (awakeFlag = a),
    pending: () => scheduled.length,
    // Run the next queued frame at time t.
    flush: (t: number) => {
      time = t;
      const cb = scheduled.shift();
      if (cb) cb(t);
    },
  };
}

describe("createFlaskFieldLoop", () => {
  it("invokes every registered sync fn on each tick", () => {
    const h = makeHarness({ awake: true });
    let a = 0;
    let b = 0;
    h.loop.register("a", () => a++);
    h.loop.register("b", () => b++);
    h.flush(16);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it("stops calling a fn after unregister", () => {
    const h = makeHarness({ awake: true });
    let a = 0;
    h.loop.register("a", () => a++);
    h.flush(16);
    h.loop.unregister("a");
    h.flush(32);
    expect(a).toBe(1); // not 2
  });

  it("suspends (stops scheduling) when nothing is awake and the wake window has expired", () => {
    const h = makeHarness({ awake: false, wakeMs: 600 });
    h.loop.register("a", () => {}); // sets wakeUntil = now(0)+600
    expect(h.pending()).toBe(1);
    h.flush(700); // past the wake window, nothing awake
    expect(h.pending()).toBe(0); // did NOT reschedule -> suspended
  });

  it("keeps running while the wake window is open even if nothing is awake", () => {
    const h = makeHarness({ awake: false, wakeMs: 600 });
    h.loop.register("a", () => {});
    h.flush(100); // still inside the 600ms window
    expect(h.pending()).toBe(1); // rescheduled
  });

  it("keeps running while a body is awake even after the wake window expires", () => {
    const h = makeHarness({ awake: true, wakeMs: 600 });
    h.loop.register("a", () => {});
    h.flush(5000); // window expired, but awake
    expect(h.pending()).toBe(1);
  });

  it("resumes after suspension when wake() is called", () => {
    const h = makeHarness({ awake: false, wakeMs: 600 });
    h.loop.register("a", () => {});
    h.flush(700); // suspends
    expect(h.pending()).toBe(0);
    h.loop.wake();
    expect(h.pending()).toBe(1); // running again
  });

  it("clamps the update delta to 32ms and skips the first frame", () => {
    const h = makeHarness({ awake: true });
    h.loop.register("a", () => {});
    h.flush(10); // first tick: no update (no prior timestamp)
    h.flush(100); // delta 90 -> clamped to 32
    h.flush(110); // delta 10 -> 10
    expect(h.updates).toEqual([32, 10]);
  });
});
