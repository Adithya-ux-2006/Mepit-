/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Uses a fixed-window counter per IP address. Entries are automatically
 * cleaned up to prevent memory leaks.
 *
 * NOTE: This is an in-memory store — counters reset on cold starts in
 * serverless environments (Vercel). For production-grade persistence,
 * swap in Upstash Redis by setting UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN env vars (the wrapper will pick them up).
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 60 seconds to remove expired entries.
// Guard against serverless environments where timers never fire.
if (typeof setInterval !== 'undefined' && !process.env.VERCEL) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.windowStart > 60_000) {
        store.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check rate limit for a given key (typically the client IP).
 * Returns whether the request is allowed and retry information.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const { maxRequests, windowMs = 60_000 } = config;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window — start fresh
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: 0,
    };
  }

  // Within current window — check before incrementing to avoid unbounded growth
  if (entry.count >= maxRequests) {
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  entry.count += 1;

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Extract a rate-limit key from a request (IP address via standard headers).
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.VERCEL === '1' || process.env.TRUST_PROXY_HEADERS === 'true';
  if (!trustProxy) return 'direct-client';

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Apply rate limiting and return a 429 response if exceeded.
 * Returns null if the request is allowed.
 */
export function rateLimitResponse(
  request: Request,
  config: RateLimitConfig,
): Response | null {
  const key = `${config.maxRequests}:${config.windowMs ?? 60_000}:${getClientIp(request)}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return Response.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSeconds),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(
            Math.ceil(Date.now() / 1000 + result.retryAfterSeconds),
          ),
        },
      },
    );
  }

  return null; // Allowed — caller continues
}

/**
 * Preset rate limit configurations for different route categories.
 */
export const rateLimits = {
  /** Login / session creation — strict to prevent brute-force */
  auth: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
  /** User creation — prevent mass account creation */
  createUser: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Logout — prevent session-clearing flood */
  logout: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** General API reads — generous for normal app usage */
  read: { maxRequests: 120, windowMs: 60_000 } as RateLimitConfig,
  /** Writes (create/update) — moderate */
  write: { maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
} as const;

// ============================================================================
// STATUS — Admin dashboard visibility
// ============================================================================

export interface RateLimitBucketStatus {
  /** Client IP or key */
  ip: string;
  /** Number of requests in the current window */
  requestCount: number;
  /** Max allowed in this window */
  maxRequests: number;
  /** Window start timestamp (ms) */
  windowStart: number;
  /** Seconds remaining until the window resets */
  secondsUntilReset: number;
  /** Whether this IP is currently throttled */
  throttled: boolean;
}

export interface RateLimitStatus {
  /** Snapshot of active buckets (top N by usage, sorted descending) */
  activeBuckets: RateLimitBucketStatus[];
  /** Total number of active buckets in memory */
  totalBuckets: number;
  /** The configured rate limit presets */
  presets: Record<string, RateLimitConfig>;
  /** Server timestamp for the snapshot */
  snapshotAt: string;
}

/**
 * Get the current state of the rate limit store for admin visibility.
 * Returns a snapshot of the top buckets by usage.
 */
export function getRateLimitStatus(topN = 20): RateLimitStatus {
  const now = Date.now();
  const buckets: RateLimitBucketStatus[] = [];

  for (const [ip, entry] of store) {
    const windowMs = 60_000; // All presets use 60s windows
    const secondsUntilReset = Math.max(
      0,
      Math.ceil((entry.windowStart + windowMs - now) / 1000),
    );

    // Determine maxRequests for this bucket by checking which preset it matches
    // Since all presets use the same window, we use the entry count to infer
    const maxRequests = entry.count >= 120 ? 120 : entry.count >= 30 ? 30 : entry.count >= 10 ? 10 : 5;

    buckets.push({
      ip,
      requestCount: entry.count,
      maxRequests,
      windowStart: entry.windowStart,
      secondsUntilReset,
      throttled: entry.count >= maxRequests,
    });
  }

  // Sort by request count descending, take top N
  buckets.sort((a, b) => b.requestCount - a.requestCount);

  return {
    activeBuckets: buckets.slice(0, topN),
    totalBuckets: store.size,
    presets: {
      auth: rateLimits.auth,
      logout: rateLimits.logout,
      createUser: rateLimits.createUser,
      read: rateLimits.read,
      write: rateLimits.write,
    },
    snapshotAt: new Date().toISOString(),
  };
}
