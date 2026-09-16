import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the build root: a stray lockfile in a parent directory otherwise changes what
  // Turbopack considers the project.
  turbopack: { root: __dirname },

  // No third-party scripts anywhere, and nothing embedding us. Health data does not belong
  // in someone else's iframe.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
