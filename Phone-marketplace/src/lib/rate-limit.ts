// Simple in-memory rate limiter (token-bucket style, fixed window)
// Note: Suitable for single-instance / single-region deployments. Replace
// with a shared store (Redis, Upstash, etc.) when running multiple instances.

type Bucket = {
  count: number
  resetAt: number
}

type Registry = {
  view: Map<string, Bucket>
}

const globalForRateLimit = globalThis as unknown as {
  __rateLimitRegistry: Registry | undefined
}

const registry: Registry =
  globalForRateLimit.__rateLimitRegistry ?? {
    view: new Map<string, Bucket>(),
  }

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.__rateLimitRegistry = registry
}

// Best-effort cleanup so the map does not grow unbounded over time.
function sweepExpired(now: number) {
  for (const [key, bucket] of registry.view) {
    if (bucket.resetAt <= now) registry.view.delete(key)
  }
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export type RateLimitOptions = {
  /** Max number of allowed hits in the window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

/**
 * Check (and increment) the counter for a given key.
 * Returns whether the call is allowed and how many hits remain in the window.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now()

  // Cheap periodic sweep (avoid running on every call)
  if (registry.view.size > 0 && registry.view.size % 50 === 0) {
    sweepExpired(now)
  }

  const existing = registry.view.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    registry.view.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  }
}

/** Extract the client IP from common proxy headers, falling back to "unknown". */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const real = headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}
