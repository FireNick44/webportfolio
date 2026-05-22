import { describe, it, expect } from "vitest";
import { createChainBodies } from "./createChainBodies";
import { CHAIN_SEGMENT_WIDTH, getSegmentHeight } from "./constants";

describe("createChainBodies scale", () => {
  it("scales segment width and height by scale", () => {
    const full = createChainBodies(100, 0, 4, 1.0);
    const half = createChainBodies(100, 0, 4, 0.5);
    const wFull = full.segments[2].bounds.max.x - full.segments[2].bounds.min.x;
    const wHalf = half.segments[2].bounds.max.x - half.segments[2].bounds.min.x;
    expect(wHalf).toBeCloseTo(wFull * 0.5, 1);
    expect(half.segmentHeights[1]).toBeCloseTo(getSegmentHeight(1) * 0.5, 5);
    expect(full.segmentHeights[0]).toBeCloseTo(getSegmentHeight(0), 5);
    expect(CHAIN_SEGMENT_WIDTH).toBeGreaterThan(0);
  });
});
