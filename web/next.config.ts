import type { NextConfig } from "next";
import { computeBuildEnv } from "./src/lib/buildEnv";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: computeBuildEnv(),
  async rewrites() {
    // Array rewrites run AFTER the filesystem/public check, so
    // /v/2024/<asset> is served from public directly; only the bare
    // directory path needs mapping to its index.html.
    return [{ source: "/v/2024", destination: "/v/2024/index.html" }];
  },
  async redirects() {
    // Old /settings path renamed to /technical (308, permanent).
    return [
      {
        source: "/:lang/settings",
        destination: "/:lang/technical",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
