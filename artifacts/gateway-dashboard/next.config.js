/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  poweredByHeader: false,
  // Replit's preview pane renders the dev server inside a proxied iframe.
  // X-Frame-Options: DENY blocks that entirely, so it is relaxed only in
  // development (this repo's canonical production config is unchanged).
  ...(isDev
    ? {
        allowedDevOrigins: [
          "*.replit.dev",
          "*.janeway.replit.dev",
          "*.repl.co",
          ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : [])
        ]
      }
    : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(isDev ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
