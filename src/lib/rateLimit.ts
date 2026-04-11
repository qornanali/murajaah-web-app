import "server-only";

import {
  BOOKMARK_RATE_LIMIT_WINDOW_MS,
  BOOKMARK_RATE_LIMIT_MAX,
} from "@/lib/config";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }

  lastCleanup = now;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupStaleEntries();

  const now = Date.now();
  let entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    rateLimitMap.set(identifier, entry);
  }

  entry.count += 1;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

export const BOOKMARK_RATE_LIMIT: RateLimitConfig = {
  windowMs: BOOKMARK_RATE_LIMIT_WINDOW_MS,
  maxRequests: BOOKMARK_RATE_LIMIT_MAX,
};

export function createRateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "Content-Type": "application/json",
      },
    },
  );
}
