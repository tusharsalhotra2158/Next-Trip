import type { NextConfig } from "next";

// Security headers standing in for the Express backend's `helmet()` defaults.
//
// - /api/* gets helmet's full default set (minus CSP), exactly as before.
// - Pages get the same set except `Referrer-Policy: no-referrer` (relaxed to
//   strict-origin-when-cross-origin, since embedded YouTube players need a
//   referrer) and `Cross-Origin-Resource-Policy` (not needed for documents).
//
// A Content-Security-Policy is deliberately NOT set: a strict CSP needs
// per-request nonces for Next's inline scripts plus allow-lists for the map
// tiles / photo / video hosts, and a wrong one silently breaks `next dev`.
// Add one (e.g. via proxy.ts with nonces) as a follow-up.
const baseSecurityHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Download-Options", value: "noopen" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-XSS-Protection", value: "0" },
];

const nextConfig: NextConfig = {
  // helmet also removes X-Powered-By.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...baseSecurityHeaders, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }],
      },
      {
        // Later entries override earlier ones for the same header key.
        source: "/api/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
