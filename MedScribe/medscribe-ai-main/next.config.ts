import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  poweredByHeader: false,
  redirects: async () => [
    {
      source: "/favicon.ico",
      destination: "/icon.png",
      permanent: false,
    },
  ],
  headers: async () => [
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
            isDev
              ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
              : "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "style-src-elem 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com",
            "font-src 'self' https://fonts.gstatic.com",
            `connect-src 'self' wss://*.supabase.co https://*.supabase.co wss://api.deepgram.com https://api.deepgram.com https://api.anthropic.com https://accounts.google.com https://oauth2.googleapis.com https://openidconnect.googleapis.com${isDev ? " wss://localhost:* http://localhost:*" : ""}`,
            "frame-src https://accounts.google.com",
            "media-src 'self' blob:",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
