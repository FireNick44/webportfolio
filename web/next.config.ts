import type { NextConfig } from "next";
import { computeBuildEnv } from "./src/lib/buildEnv";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. Everything is same-origin at runtime: next/font
// self-hosts the Google fonts at build time, Resend is called server-side only,
// and there are no analytics/third-party scripts. 'unsafe-inline' is required
// for Next's inline bootstrap + the anti-flash theme script (no nonce infra);
// 'unsafe-eval' is dev-only (Turbopack/HMR needs it, prod does not).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'" + (isDev ? " ws:" : ""),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: computeBuildEnv(),
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
