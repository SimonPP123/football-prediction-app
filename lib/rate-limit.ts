/**
 * Reusable Rate Limiter
 *
 * Provides configurable rate limiting for any endpoint.
 * Uses in-memory storage (suitable for single-instance deployments).
 *
 * For multi-instance deployments, replace with Redis-based implementation.
 */

interface RateLimitEntry {
  count: number
  firstAttempt: number
  blockedUntil?: number
}

interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxAttempts: number     // Max requests allowed in window
  blockDurationMs?: number // Optional: how long to block after exceeding (default: same as window)
  keyPrefix?: string      // Optional: prefix for keys to namespace different limiters
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number  // Seconds until rate limit resets
  reason?: string
}

// In-memory storage for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

// Auto-cleanup expired entries
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    const keysToDelete: string[] = []

    rateLimitStore.forEach((entry, key) => {
      const windowEnd = entry.firstAttempt + (entry.blockedUntil ? entry.blockedUntil - entry.firstAttempt : CLEANUP_INTERVAL_MS * 2)
      if (now > windowEnd) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => rateLimitStore.delete(key))
  }, CLEANUP_INTERVAL_MS)
}

startCleanup()

/**
 * Create a rate limiter with the specified configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxAttempts,
    blockDurationMs = windowMs,
    keyPrefix = 'rl'
  } = config

  return {
    /**
     * Check if a request should be allowed
     */
    check(key: string): RateLimitResult {
      const fullKey = `${keyPrefix}:${key}`
      const now = Date.now()
      const entry = rateLimitStore.get(fullKey)

      // Check if currently blocked
      if (entry?.blockedUntil && now < entry.blockedUntil) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000)
        return {
          allowed: false,
          remaining: 0,
          retryAfter,
          reason: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        }
      }

      // Check if within window
      if (entry && now - entry.firstAttempt < windowMs) {
        if (entry.count >= maxAttempts) {
          // Block the client
          entry.blockedUntil = now + blockDurationMs
          const retryAfter = Math.ceil(blockDurationMs / 1000)
          return {
            allowed: false,
            remaining: 0,
            retryAfter,
            reason: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
          }
        }
        return {
          allowed: true,
          remaining: maxAttempts - entry.count
        }
      }

      // Window expired or no entry - allow
      return {
        allowed: true,
        remaining: maxAttempts
      }
    },

    /**
     * Record a request (call after check() if request proceeds)
     */
    record(key: string): void {
      const fullKey = `${keyPrefix}:${key}`
      const now = Date.now()
      const entry = rateLimitStore.get(fullKey)

      if (entry && now - entry.firstAttempt < windowMs) {
        entry.count++
      } else {
        rateLimitStore.set(fullKey, {
          count: 1,
          firstAttempt: now
        })
      }
    },

    /**
     * Clear rate limit for a key (e.g., on successful action)
     */
    clear(key: string): void {
      const fullKey = `${keyPrefix}:${key}`
      rateLimitStore.delete(fullKey)
    },

    /**
     * Get rate limit headers for response
     */
    getHeaders(key: string): Record<string, string> {
      const result = this.check(key)
      const headers: Record<string, string> = {
        'X-RateLimit-Limit': String(maxAttempts),
        'X-RateLimit-Remaining': String(result.remaining)
      }
      if (result.retryAfter) {
        headers['Retry-After'] = String(result.retryAfter)
        headers['X-RateLimit-Reset'] = String(Math.ceil(Date.now() / 1000) + result.retryAfter)
      }
      return headers
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */

// Prediction generation: 10 requests per hour per IP
export const predictionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxAttempts: 10,
  keyPrefix: 'pred'
})

// Match analysis generation: 5 requests per hour per IP
export const analysisRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxAttempts: 5,
  keyPrefix: 'analysis'
})

// Data refresh: 20 requests per hour per IP
export const refreshRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxAttempts: 20,
  keyPrefix: 'refresh'
})

// Password reset request: 3 per hour per username
export const resetPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxAttempts: 3,
  keyPrefix: 'pwreset'
})

/**
 * Helper to get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
