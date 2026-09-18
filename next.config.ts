import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `unauthorized()` and `forbidden()` are what the role guards raise. Without this they
  // throw a 500 instead of a 401/403 — it fails closed, so it was never a hole, but a
  // signed-out visitor to an admin page deserves the right answer rather than a crash.
  experimental: { authInterrupts: true },

  // End-to-end runs use their own build directory so they can start a dev server while a
  // developer's own is already running — Next locks that per directory, and the two would
  // otherwise refuse to coexist.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

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
      {
        // The donation hand-off tells the charity nothing at all — not even that the person
        // came from here. Our origin alone would disclose that this visitor uses a health
        // platform, and on a single-condition charity that is close to disclosing a
        // diagnosis.
        //
        // This must come AFTER the site-wide rule. Next applies every matching entry, and
        // for a repeated header key the last match wins — so listing the narrower rule
        // first, which reads more naturally, silently does nothing.
        source: "/charities/:slug/donate",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
