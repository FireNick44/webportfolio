import { describe, it, expect } from "vitest";
import { generateBubbles } from "./bubbles";

const bounds = { width: 800, height: 400 };

describe("generateBubbles", () => {
  it("is deterministic for the same seed", () => {
    expect(generateBubbles(7, 30, bounds)).toEqual(generateBubbles(7, 30, bounds));
  });

  it("differs for a different seed", () => {
    expect(generateBubbles(7, 30, bounds)).not.toEqual(generateBubbles(8, 30, bounds));
  });

  it("produces exactly `count` bubbles", () => {
    expect(generateBubbles(7, 24, bounds)).toHaveLength(24);
  });

  it("keeps every bubble inside sane bounds", () => {
    for (const b of generateBubbles(7, 50, bounds)) {
      expect(b.baseX).toBeGreaterThanOrEqual(0);
      expect(b.baseX).toBeLessThanOrEqual(1);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeLessThanOrEqual(bounds.height);
      expect(b.r).toBeGreaterThan(0);
      expect(b.speed).toBeGreaterThan(0);
    }
  });
});
