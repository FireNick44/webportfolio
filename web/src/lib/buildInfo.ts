export interface BuildInfo {
  version: string;
  gitSha: string;
  buildDate: string;
  stack: {
    next: string;
    react: string;
    tailwind: string;
    matter: string;
    typescript: string;
  };
  /** Live-at-build-time stats (refreshed on every deploy). Used by the footer's
   *  <files> column to show real counts instead of hand-typed numbers. */
  stats: {
    commits: string;
    srcFiles: string;
    srcKb: string;
  };
}

// NEXT_PUBLIC_* are inlined at build time, so this is a static constant.
export const buildInfo: BuildInfo = {
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
  gitSha: process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown",
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE ?? "",
  stack: {
    next: process.env.NEXT_PUBLIC_STACK_NEXT ?? "",
    react: process.env.NEXT_PUBLIC_STACK_REACT ?? "",
    tailwind: process.env.NEXT_PUBLIC_STACK_TAILWIND ?? "",
    matter: process.env.NEXT_PUBLIC_STACK_MATTER ?? "",
    typescript: process.env.NEXT_PUBLIC_STACK_TYPESCRIPT ?? "",
  },
  stats: {
    commits: process.env.NEXT_PUBLIC_COMMIT_COUNT ?? "0",
    srcFiles: process.env.NEXT_PUBLIC_SRC_FILE_COUNT ?? "0",
    srcKb: process.env.NEXT_PUBLIC_SRC_KB ?? "0",
  },
};
