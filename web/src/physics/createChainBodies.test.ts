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

describe("createChainBodies skeleton (partial physics)", () => {
  it("simulates only the bottom links, pinned below the static top", () => {
    const anchorY = 50;
    const staticCount = 3;
    const segmentCount = 8;
    const chain = createChainBodies(100, anchorY, segmentCount, 1, staticCount);

    // only the bottom (segmentCount - staticCount) links become physics bodies
    expect(chain.segments.length).toBe(segmentCount - staticCount); // 5

    const staticHeight =
      getSegmentHeight(0) + getSegmentHeight(1) + getSegmentHeight(2);
    expect(chain.staticHeight).toBeCloseTo(staticHeight, 5);

    // physics sub-chain is pinned at anchorY + staticHeight...
    expect(chain.anchorConstraint.pointA!.y).toBeCloseTo(
      anchorY + staticHeight,
      5
    );
    // ...and the first physics body's top edge sits exactly there.
    expect(chain.segments[0].bounds.min.y).toBeCloseTo(anchorY + staticHeight, 5);

    // physics heights continue the full-chain indexing (link 3 of 8)
    expect(chain.segmentHeights[0]).toBeCloseTo(getSegmentHeight(staticCount), 5);
  });

  it("defaults to a fully-physics chain when staticCount is 0", () => {
    const chain = createChainBodies(100, 0, 6, 1);
    expect(chain.segments.length).toBe(6);
    expect(chain.staticHeight).toBe(0);
  });
});
