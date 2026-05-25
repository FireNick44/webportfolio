import { describe, it, expect } from "vitest";
import { isTap, classifyTap, enoughOnTaps, INK_WINDOW } from "./ink";

describe("isTap (tap vs scroll)", () => {
  it("brief + still = tap", () => expect(isTap(200, 5)).toBe(true));
  it("too long = not a tap (scroll hold)", () => expect(isTap(300, 5)).toBe(false));
  it("moved too far = not a tap (scroll drag)", () => expect(isTap(200, 20)).toBe(false));
  it("boundaries inclusive", () => expect(isTap(250, 10)).toBe(true));
});

describe("classifyTap", () => {
  it("on him within hit radius", () => {
    expect(classifyTap(50)).toBe("on");
    expect(classifyTap(70)).toBe("on");
  });
  it("around him within scare radius", () => {
    expect(classifyTap(120)).toBe("around");
    expect(classifyTap(180)).toBe("around");
  });
  it("miss beyond scare radius", () => expect(classifyTap(300)).toBe("miss"));
});

describe("enoughOnTaps (deterministic 2-in-window)", () => {
  it("one tap is not enough", () => expect(enoughOnTaps([1000], 1000)).toBe(false));
  it("two taps within the window inks", () =>
    expect(enoughOnTaps([1000, 1500], 1500)).toBe(true));
  it("two taps too far apart do not (first expired)", () =>
    expect(enoughOnTaps([0, INK_WINDOW + 100], INK_WINDOW + 100)).toBe(false));
  it("counts only taps inside the trailing window", () =>
    expect(enoughOnTaps([0, 100, 5000, 5400], 5400)).toBe(true));
});
