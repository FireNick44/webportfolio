import { describe, it, expect } from "vitest";
import { resolveSpan, type ProjectsLayout } from "./projectsLayout";

const LAYOUT: ProjectsLayout = {
  columns: { base: 2, sm: 3, lg: 4 },
  rowHeight: "11rem",
  gap: "1rem",
  sizes: {
    default: { col: 1, row: 1 },
    wide: { col: 2, row: 1 },
    large: { col: 2, row: 2 },
  },
};

describe("resolveSpan", () => {
  it("returns the matching size token's span", () => {
    expect(resolveSpan(LAYOUT, "large")).toEqual({ col: 2, row: 2 });
    expect(resolveSpan(LAYOUT, "wide")).toEqual({ col: 2, row: 1 });
  });

  it("falls back to default when size is undefined", () => {
    expect(resolveSpan(LAYOUT, undefined)).toEqual({ col: 1, row: 1 });
  });

  it("falls back to default for an unknown size token", () => {
    expect(resolveSpan(LAYOUT, "ginormous")).toEqual({ col: 1, row: 1 });
  });

  it("falls back to 1x1 when the default token is absent", () => {
    const noDefault: ProjectsLayout = {
      ...LAYOUT,
      sizes: { wide: { col: 2, row: 1 } },
    };
    expect(resolveSpan(noDefault, undefined)).toEqual({ col: 1, row: 1 });
  });
});
