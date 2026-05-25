import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanRange, computeBuildEnv } from "./buildEnv";

describe("buildEnv", () => {
  it("cleanRange strips semver range operators", () => {
    expect(cleanRange("^16.2.6")).toBe("16.2.6");
    expect(cleanRange("~1.0.0")).toBe("1.0.0");
    expect(cleanRange(">=2.3.4")).toBe("2.3.4");
    expect(cleanRange(undefined)).toBe("");
  });

  it("computeBuildEnv version matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    );
    const env = computeBuildEnv();
    expect(env.NEXT_PUBLIC_APP_VERSION).toBe(pkg.version);
    expect(env.NEXT_PUBLIC_STACK_NEXT).toMatch(/^\d+\.\d+/);
    expect(env.NEXT_PUBLIC_GIT_SHA.length).toBeGreaterThan(0);
    expect(env.NEXT_PUBLIC_BUILD_DATE).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
