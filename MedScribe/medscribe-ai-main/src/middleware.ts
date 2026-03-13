import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter for AI API routes.
// 5 requests per 60 seconds per IP.  Runs on the Edge Runtime so the Map
// persists across warm invocations within the same region.
// ---------------------------------------------------------------------------

const AI_RATE_LIMIT = 5;
const AI_WINDOW_MS = 60_000;

const aiRateLimitStore = new Map<string, number[]>();

let lastCleanup = Date.now();
function cleanupStore() {
  const now = Date.now();
  if (now - lastCleanup < AI_WINDOW_MS) return;
  lastCleanup = now;
  const cutoff = now - AI_WINDOW_MS;
  for (const [key, timestamps] of aiRateLimitStore) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      aiRateLimitStore.delete(key);
    } else {
      aiRateLimitStore.set(key, filtered);
    }
  }
}

function checkAIRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
  cleanupStore();
  const now = Date.now();
  const cutoff = now - AI_WINDOW_MS;

  let timestamps = aiRateLimitStore.get(ip);
  if (!timestamps) {
    timestamps = [];
    aiRateLimitStore.set(ip, timestamps);
  }

  const recent = timestamps.filter((t) => t > cutoff);
  aiRateLimitStore.set(ip, recent);

  if (recent.length >= AI_RATE_LIMIT) {
    const retryAfterMs = recent[0] + AI_WINDOW_MS - now;
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  return { allowed: true, remaining: AI_RATE_LIMIT - recent.length, retryAfterSec: 0 };
}

// Paths that call external AI services (Anthropic, Deepgram).
const AI_PATH_PREFIXES = [
  "/api/ai/",
  "/api/deepgram/",
  "/api/generate-note",
  "/api/notes/regenerate",
  "/api/visit-summaries",
  "/api/intake/responses",
  "/api/education",
];

function isAIRoute(pathname: string): boolean {
  return AI_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit AI routes before they reach the handler.
  if (isAIRoute(pathname) && (request.method === "POST" || request.method === "PUT")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    const result = checkAIRateLimit(ip);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 5 AI requests per minute.",
          retry_after_seconds: result.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSec),
            "X-RateLimit-Limit": String(AI_RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Pass rate limit info in response headers for transparency.
    const response = await updateSession(request);
    response.headers.set("X-RateLimit-Limit", String(AI_RATE_LIMIT));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    "/((?!monitoring|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
