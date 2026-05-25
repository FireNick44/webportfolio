export interface BuildInfo {
  version: string;
  gitSha: string;
  buildDate: string;
  stack: { next: string; react: string; tailwind: string };
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
  },
};
