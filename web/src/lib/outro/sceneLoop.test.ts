import { describe, expect, it, vi } from "vitest";

import { createSceneLoop, MAX_DT, type SceneFrame } from "./sceneLoop";

function harness() {
  const queue: Array<(t: number) => void> = [];
  const cancel = vi.fn();
  const measure = vi.fn(() => ({ width: 1000, height: 500 }));
  const loop = createSceneLoop({
    schedule: (cb) => {
      queue.push(cb);
      return queue.length;
    },
    cancel,
  });
  loop.setTarget({ getBoundingClientRect: measure });
  const step = (t: number) => {
    const cb = queue.shift();
    if (!cb) throw new Error("nothing scheduled");
    cb(t);
  };
  return { loop, step, queue, cancel, measure };
}

describe("createSceneLoop", () => {
  it("falls back to a default size before a target is set", () => {
    const { loop, step } = harness();
    loop.setTarget(null);
    const fn = vi.fn();
    loop.subscribe(fn);
    step(1);
    expect(fn.mock.calls[0][0]).toMatchObject({ width: 1000, height: 800 });
  });

  it("starts on first subscribe, measures once per frame, fans out the same frame", () => {
    const { loop, step, queue, measure } = harness();
    expect(loop.running).toBe(false);
    const a = vi.fn();
    const b = vi.fn();
    loop.subscribe(a);
    loop.subscribe(b);
    expect(loop.running).toBe(true);
    expect(queue.length).toBe(1); // one rAF for both subscribers

    step(1000);
    step(1016);
    expect(measure).toHaveBeenCalledTimes(2);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    const f1: SceneFrame = a.mock.calls[1][0];
    expect(f1).toEqual({ now: 1016, dtMs: 16, width: 1000, height: 500 });
    expect(b.mock.calls[1][0]).toBe(f1);
  });

  it("first frame has dt 0 and long gaps are clamped", () => {
    const { loop, step } = harness();
    const fn = vi.fn();
    loop.subscribe(fn);
    step(500);
    expect(fn.mock.calls[0][0].dtMs).toBe(0);
    step(5000);
    expect(fn.mock.calls[1][0].dtMs).toBe(MAX_DT);
  });

  it("stops (cancels rAF) when the last subscriber leaves, restarts fresh", () => {
    const { loop, step, queue, cancel } = harness();
    const fn = vi.fn();
    const off1 = loop.subscribe(fn);
    const off2 = loop.subscribe(() => fn());
    step(100);
    off1();
    expect(loop.running).toBe(true);
    off2();
    expect(loop.running).toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
    queue.length = 0;

    loop.subscribe(fn);
    step(900);
    expect(fn.mock.calls.at(-1)?.[0].dtMs).toBe(0); // no dt bleed from the old run
  });

  it("a subscriber may unsubscribe itself mid-frame", () => {
    const { loop, step } = harness();
    let off = () => {};
    const once = vi.fn(() => off());
    const other = vi.fn();
    off = loop.subscribe(once);
    loop.subscribe(other);
    step(1);
    step(2);
    expect(once).toHaveBeenCalledTimes(1);
    expect(other).toHaveBeenCalledTimes(2);
  });
});
