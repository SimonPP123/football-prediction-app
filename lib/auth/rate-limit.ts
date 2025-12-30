/**
 * Simple in-memory rate limiter for login attempts
 * In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number
  firstAttempt: number
  blockedUntil?: number
}

// Store rate limit data in memory
const ipAttempts = new Map<string, RateLimitEntry>()
const usernameAttempts = new Map<string, RateLimitEntry>()

// Configuration
const MAX_ATTEMPTS_PER_IP = 5
const MAX_ATTEMPTS_PER_USERNAME = 10
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes block

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Array.from(ipAttempts.entries()).forEach(([key, entry]) => {
    if (now - entry.firstAttempt > WINDOW_MS && !entry.blockedUntil) {
      ipAttempts.delete(key)
    } else if (entry.blockedUntil && now > entry.blockedUntil) {
      ipAttempts.delete(key)
    }
  })
  Array.from(usernameAttempts.entries()).forEach(([key, entry]) => {
    if (now - entry.firstAttempt > WINDOW_MS && !entry.blockedUntil) {
      usernameAttempts.delete(key)
    } else if (entry.blockedUntil && now > entry.blockedUntil) {
      usernameAttempts.delete(key)
    }
  })
}, 5 * 60 * 1000)

/**
 * Check if an IP or username is rate limited
 * Returns { allowed: true } if request is allowed
 * Returns { allowed: false, retryAfter: seconds } if blocked
 */
export function checkRateLimit(
  ip: string,
  username?: string
): { allowed: true } | { allowed: false; retryAfter: number; reason: string } {
  const now = Date.now()

  // Check IP rate limit
  const ipEntry = ipAttempts.get(ip)
  if (ipEntry) {
    if (ipEntry.blockedUntil && now < ipEntry.blockedUntil) {
      const retryAfter = Math.ceil((ipEntry.blockedUntil - now) / 1000)
      return { allowed: false, retryAfter, reason: 'Too many login attempts from this IP' }
    }
    if (now - ipEntry.firstAttempt < WINDOW_MS && ipEntry.count >= MAX_ATTEMPTS_PER_IP) {
      // Block the IP
      ipEntry.blockedUntil = now + BLOCK_DURATION_MS
      const retryAfter = Math.ceil(BLOCK_DURATION_MS / 1000)
      return { allowed: false, retryAfter, reason: 'Too many login attempts from this IP' }
    }
  }

  // Check username rate limit
  if (username) {
    const userEntry = usernameAttempts.get(username.toLowerCase())
    if (userEntry) {
      if (userEntry.blockedUntil && now < userEntry.blockedUntil) {
        const retryAfter = Math.ceil((userEntry.blockedUntil - now) / 1000)
        return { allowed: false, retryAfter, reason: 'Too many login attempts for this account' }
      }
      if (now - userEntry.firstAttempt < WINDOW_MS && userEntry.count >= MAX_ATTEMPTS_PER_USERNAME) {
        userEntry.blockedUntil = now + BLOCK_DURATION_MS
        const retryAfter = Math.ceil(BLOCK_DURATION_MS / 1000)
        return { allowed: false, retryAfter, reason: 'Too many login attempts for this account' }
      }
    }
  }

  return { allowed: true }
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(ip: string, username?: string): void {
  const now = Date.now()

  // Record IP attempt
  const ipEntry = ipAttempts.get(ip)
  if (ipEntry) {
    if (now - ipEntry.firstAttempt > WINDOW_MS) {
      // Reset window
      ipAttempts.set(ip, { count: 1, firstAttempt: now })
    } else {
      ipEntry.count++
    }
  } else {
    ipAttempts.set(ip, { count: 1, firstAttempt: now })
  }

  // Record username attempt
  if (username) {
    const key = username.toLowerCase()
    const userEntry = usernameAttempts.get(key)
    if (userEntry) {
      if (now - userEntry.firstAttempt > WINDOW_MS) {
        usernameAttempts.set(key, { count: 1, firstAttempt: now })
      } else {
        userEntry.count++
      }
    } else {
      usernameAttempts.set(key, { count: 1, firstAttempt: now })
    }
  }
}

/**
 * Clear rate limit entries for an IP/username after successful login
 */
export function clearRateLimitOnSuccess(ip: string, username?: string): void {
  ipAttempts.delete(ip)
  if (username) {
    usernameAttempts.delete(username.toLowerCase())
  }
}
