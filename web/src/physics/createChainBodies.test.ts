import { describe, it, expect } from "vitest";
import { createChainBodies } from "./createChainBodies";
import { CHAIN_SEGMENT_WIDTH, getSegmentHeight } from "./constants";

describe("createChainBodies scale", () => {
  it("scales segment WIDTH by scale but keeps HEIGHT (length) independent", () => {
    const full = createChainBodies(100, 0, 4, 1.0);
    const half = createChainBodies(100, 0, 4, 0.5);
    const wFull = full.segments[2].bounds.max.x - full.segments[2].bounds.min.x;
    const wHalf = half.segments[2].bounds.max.x - half.segments[2].bounds.min.x;
    // Width thins with depth...
    expect(wHalf).toBeCloseTo(wFull * 0.5, 1);
    // ...but height stays full regardless of scale (length = segments × full h).
    expect(half.segmentHeights[1]).toBeCloseTo(getSegmentHeight(1), 5);
    expect(full.segmentHeights[1]).toBeCloseTo(getSegmentHeight(1), 5);
    expect(CHAIN_SEGMENT_WIDTH).toBeGreaterThan(0);
  });
});
