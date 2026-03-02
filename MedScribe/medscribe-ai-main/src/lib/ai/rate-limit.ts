export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const inMemoryBuckets = new Map<string, Bucket>();

function nowMs(): number {
  return Date.now();
}

function getBucketKey(userId: string, scope: string, period: "window" | "month"): string {
  if (period === "month") {
    const date = new Date();
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return `${userId}:${scope}:month:${month}`;
  }

  return `${userId}:${scope}:window`;
}

function consumeToken(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = nowMs();
  const current = inMemoryBuckets.get(key);

  if (!current || now >= current.resetAt) {
    const next: Bucket = { count: 1, resetAt: now + windowMs };
    inMemoryBuckets.set(key, next);
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - next.count),
      retryAfterSec: Math.ceil(windowMs / 1000),
      windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      windowMs,
    };
  }

  current.count += 1;
  inMemoryBuckets.set(key, current);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    windowMs,
  };
}

function getScopeConfig(scope: string): { maxPerWindow: number; windowMs: number; maxPerMonth: number } {
  const defaults: Record<string, { maxPerWindow: number; windowMs: number; maxPerMonth: number }> = {
    ask: { maxPerWindow: 40, windowMs: 60_000, maxPerMonth: 4000 },
    analyze: { maxPerWindow: 20, windowMs: 60_000, maxPerMonth: 2000 },
    generate_note: { maxPerWindow: 12, windowMs: 10 * 60_000, maxPerMonth: 1200 },
    regenerate_note: { maxPerWindow: 15, windowMs: 10 * 60_000, maxPerMonth: 1200 },
    regenerate_section: { maxPerWindow: 30, windowMs: 10 * 60_000, maxPerMonth: 2400 },
  };

  return defaults[scope] || defaults.ask;
}

export function enforceAIRateLimit(userId: string, scope: string): RateLimitResult {
  const config = getScopeConfig(scope);

  const windowKey = getBucketKey(userId, scope, "window");
  const monthKey = getBucketKey(userId, scope, "month");

  const windowResult = consumeToken(windowKey, config.maxPerWindow, config.windowMs);
  if (!windowResult.allowed) return windowResult;

  const monthlyWindowMs = 31 * 24 * 60 * 60 * 1000;
  const monthlyResult = consumeToken(monthKey, config.maxPerMonth, monthlyWindowMs);
  if (!monthlyResult.allowed) {
    return {
      ...monthlyResult,
      windowMs: monthlyWindowMs,
    };
  }

  return windowResult;
}
