import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

// Sentry SDK uses eval() at runtime for source-map resolution.
// 'unsafe-eval' is required for Sentry to work in production.
// All other XSS protections remain active (no 'unsafe-inline' on scripts
// would be ideal but Google Sign-In also needs inline scripts).
const scriptSrc = "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Unique per-build ID lets Next.js detect stale client bundles and trigger a
  // full page reload instead of rendering mismatched chunks.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || `local-${Date.now()}`,
  outputFileTracingRoot: path.resolve(__dirname),
  redirects: async () => [
    // Browsers still request /favicon.ico as a fallback regardless of HTML <link>.
    // Next.js App Router serves /icon.png from src/app/icon.tsx; redirect the .ico
    // request there so there are no 404s.
    {
      source: "/favicon.ico",
      destination: "/icon.png",
      permanent: false,
    },
  ],
  headers: async () => [
    // Prevent HTML pages from being served stale — ensures clients always
    // fetch the latest deployment's page shell (which references current chunk hashes).
    {
      source: "/:path*",
      has: [{ type: "header", key: "Accept", value: ".*text/html.*" }],
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "microphone=(self), camera=(self)" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com",
            "font-src 'self' https://fonts.gstatic.com",
            `connect-src 'self' wss://*.supabase.co https://*.supabase.co wss://api.deepgram.com https://api.deepgram.com https://api.anthropic.com https://*.ingest.sentry.io https://accounts.google.com https://oauth2.googleapis.com https://openidconnect.googleapis.com${isDev ? " wss://localhost:* http://localhost:* ws://10.211.55.3:* wss://10.211.55.3:* http://10.211.55.3:* https://10.211.55.3:*" : ""}`,
            "frame-src https://accounts.google.com",
            "media-src 'self' blob:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  tunnelRoute: "/monitoring",

  silent: !process.env.CI,
});
