/**
 * Sliding-window rate limiter.
 *
 * Uses an in-memory Map keyed by identifier (user ID or IP).
 * Each entry stores an array of timestamps for recent requests.
 *
 * On Vercel serverless this works per-instance — warm instances (which
 * handle the vast majority of traffic) share the same counter.  Cold
 * starts get a fresh counter, which is acceptable as a safety net.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60_000
): RateLimitResult {
  cleanupStaleEntries(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetInMs: oldest + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetInMs: entry.timestamps[0] + windowMs - now,
  };
}

/**
 * AI-specific rate limiter.
 * 5 requests per 60 seconds per user, with separate buckets
 * for different service tiers.
 */
export function checkAIRateLimit(
  userId: string,
  service: "anthropic" | "deepgram" | "ai" = "ai"
): RateLimitResult {
  const key = `ai:${service}:${userId}`;
  return checkRateLimit(key, 5, 60_000);
}
