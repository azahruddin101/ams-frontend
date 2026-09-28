import os from "node:os";

const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

// Dev only: Next blocks its own JS/HMR for any origin other than localhost, so opening the dev server from a phone
// (http://<LAN-IP>:3000) leaves the page un-hydrated and every button dead. Allow this machine's own addresses
// plus the private LAN ranges (whole-label wildcards; `*` = exactly one label).
const lanAddresses = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
const allowedDevOrigins = [...new Set([...lanAddresses, "10.*.*.*", "192.168.*.*", "172.*.*.*", "*.local"])];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  allowedDevOrigins,
  async rewrites() {
    // Same-origin API: the httpOnly refresh cookie stays first-party, no CORS or third-party-cookie issues.
    return [{ source: "/api/:path*", destination: `${API_TARGET}/api/:path*` }];
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
