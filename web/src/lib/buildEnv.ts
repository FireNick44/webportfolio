import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Strip leading semver range operators (^ ~ >= etc.) for display. */
export function cleanRange(range?: string): string {
  return typeof range === "string" ? range.replace(/^[\^~>=<\s]+/, "") : "";
}

/** Computed at build time (next.config) — node-only. Returns NEXT_PUBLIC_*
 *  strings that get inlined into the client bundle (static, zero runtime cost). */
export function computeBuildEnv(): Record<string, string> {
  const pkg = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  );
  let sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", {
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
    } catch {
      sha = "unknown";
    }
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return {
    NEXT_PUBLIC_APP_VERSION: String(pkg.version ?? "0.0.0"),
    NEXT_PUBLIC_GIT_SHA: sha,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
    NEXT_PUBLIC_STACK_NEXT: cleanRange(deps.next),
    NEXT_PUBLIC_STACK_REACT: cleanRange(deps.react),
    NEXT_PUBLIC_STACK_TAILWIND: cleanRange(deps.tailwindcss),
  };
}
