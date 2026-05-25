import { describe, it, expect } from "vitest";
import { versions, getLatest, currentVersionId } from "./versions";

describe("versions manifest", () => {
  it("loads versions with exactly one latest", () => {
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions.filter((v) => v.isLatest)).toHaveLength(1);
  });

  it("getLatest returns the latest entry", () => {
    expect(getLatest().id).toBe("2026");
    expect(getLatest().path).toBe("/");
  });

  it("currentVersionId reads the /v/<id> prefix", () => {
    expect(currentVersionId("/v/2024")).toBe("2024");
    expect(currentVersionId("/v/2024/anything")).toBe("2024");
  });

  it("currentVersionId falls back to latest off the /v/ namespace", () => {
    expect(currentVersionId("/")).toBe("2026");
    expect(currentVersionId("/en")).toBe("2026");
    expect(currentVersionId("/en/technical")).toBe("2026");
  });
});
