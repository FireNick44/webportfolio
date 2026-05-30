import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Strip leading semver range operators (^ ~ >= etc.) for display. */
export function cleanRange(range?: string): string {
  return typeof range === "string" ? range.replace(/^[\^~>=<\s]+/, "") : "";
}

/** Recursive walk — returns total file count + byte size. Pure Node so it
 *  works in any build env (Netlify, Vercel, local). */
function walkDir(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = walkDir(p);
        files += sub.files;
        bytes += sub.bytes;
      } else if (entry.isFile()) {
        files += 1;
        try {
          bytes += statSync(p).size;
        } catch {
          /* unreadable, skip */
        }
      }
    }
  } catch {
    /* missing dir, skip */
  }
  return { files, bytes };
}

/** Computed at build time (next.config) — node-only. Returns NEXT_PUBLIC_*
 *  strings that get inlined into the client bundle (static, zero runtime cost).
 *  Each deploy refreshes the live-ish stats: commit count, source file count,
 *  source KB, build date, git sha. */
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

  // Commit count for the deployed ref. HEAD covers any branch (incl. detached
  // CI checkouts) — Netlify usually deploys main but this stays accurate.
  let commitCount = "0";
  try {
    commitCount = execSync("git rev-list --count HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    /* git unavailable, keep 0 */
  }

  // Source file count + size — walked from web/src at build time.
  const srcWalk = walkDir(join(process.cwd(), "src"));
  const srcKb = Math.round(srcWalk.bytes / 1024);

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return {
    NEXT_PUBLIC_APP_VERSION: String(pkg.version ?? "0.0.0"),
    NEXT_PUBLIC_GIT_SHA: sha,
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
    NEXT_PUBLIC_STACK_NEXT: cleanRange(deps.next),
    NEXT_PUBLIC_STACK_REACT: cleanRange(deps.react),
    NEXT_PUBLIC_STACK_TAILWIND: cleanRange(deps.tailwindcss),
    NEXT_PUBLIC_STACK_MATTER: cleanRange(deps["matter-js"]),
    NEXT_PUBLIC_STACK_TYPESCRIPT: cleanRange(deps.typescript),
    NEXT_PUBLIC_COMMIT_COUNT: commitCount,
    NEXT_PUBLIC_SRC_FILE_COUNT: String(srcWalk.files),
    NEXT_PUBLIC_SRC_KB: String(srcKb),
  };
}
