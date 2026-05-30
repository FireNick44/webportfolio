import { describe, it, expect, vi } from "vitest";

import { createFrameLoop } from "./frameLoop";

describe("frameLoop", () => {
  it("calls subscribers after stepping the engine", () => {
    const update = vi.fn();
    const sub = vi.fn();
    let cb: ((t: number) => void) | null = null;
    const loop = createFrameLoop({
      update,
      schedule: (fn) => { cb = fn; return 1; },
      cancel: () => {},
    });
    loop.subscribe("a", sub);
    loop.start();
    cb!(0);     // first frame: baseline only
    cb!(16.7);  // ~one fixed step
    expect(update).toHaveBeenCalled();
    expect(sub).toHaveBeenCalled();
  });

  it("never passes a delta above 16.667ms to update", () => {
    const deltas: number[] = [];
    let cb: ((t: number) => void) | null = null;
    const loop = createFrameLoop({
      update: (d) => deltas.push(d),
      schedule: (fn) => { cb = fn; return 1; },
      cancel: () => {},
    });
    loop.start();
    cb!(0); cb!(200); // huge gap
    expect(Math.max(...deltas)).toBeLessThanOrEqual(1000 / 60 + 1e-9);
  });
});
