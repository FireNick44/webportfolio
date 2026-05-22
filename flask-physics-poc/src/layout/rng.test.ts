import { describe, it, expect, beforeEach } from "vitest";
import { mulberry32, getSessionSeed } from "./rng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("returns values in [0,1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe("getSessionSeed", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    globalThis.sessionStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      key: () => null,
      length: 0,
    };
  });
  it("returns a stable integer within a session", () => {
    const first = getSessionSeed();
    const second = getSessionSeed();
    expect(first).toBe(second);
    expect(Number.isInteger(first)).toBe(true);
  });
  it("falls back to a fixed seed when sessionStorage throws", () => {
    // @ts-expect-error force failure
    globalThis.sessionStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    expect(Number.isInteger(getSessionSeed())).toBe(true);
  });
});
