import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline'";

const nextConfig: NextConfig = {
  // Redeploy: ensure Vercel picks up new Supabase env vars
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  outputFileTracingRoot: path.resolve(__dirname),
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "microphone=(self)" },
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
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self' wss://*.supabase.co https://*.supabase.co wss://api.deepgram.com https://api.deepgram.com https://api.anthropic.com wss://localhost:* http://localhost:* ws://10.211.55.3:* wss://10.211.55.3:* http://10.211.55.3:* https://10.211.55.3:*",
            "media-src 'self' blob:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
