import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    // Array rewrites run AFTER the filesystem/public check, so
    // /v/2024/<asset> is served from public directly; only the bare
    // directory path needs mapping to its index.html.
    return [{ source: "/v/2024", destination: "/v/2024/index.html" }];
  },
};

export default nextConfig;
