import { createHmac } from 'crypto'

function getCookieSecret(): string {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    throw new Error('COOKIE_SECRET environment variable is required')
  }
  return secret
}

/**
 * Signs a value using HMAC-SHA256
 */
export function sign(value: string): string {
  const signature = createHmac('sha256', getCookieSecret())
    .update(value)
    .digest('base64url')
  return `${value}.${signature}`
}

/**
 * Verifies a signed value and returns the original value if valid
 * Returns null if invalid
 */
export function unsign(signedValue: string): string | null {
  const lastDotIndex = signedValue.lastIndexOf('.')
  if (lastDotIndex === -1) return null

  const value = signedValue.slice(0, lastDotIndex)
  const signature = signedValue.slice(lastDotIndex + 1)

  const expectedSignature = createHmac('sha256', getCookieSecret())
    .update(value)
    .digest('base64url')

  // Timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return null

  let mismatch = 0
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }

  return mismatch === 0 ? value : null
}

/**
 * Signs auth data for cookie storage
 */
export function signAuthCookie(data: {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}): string {
  const jsonData = JSON.stringify(data)
  return sign(jsonData)
}

/**
 * Verifies and parses signed auth cookie
 * Returns null if invalid signature or malformed data
 */
export function verifyAuthCookie(signedCookie: string): {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
} | null {
  const jsonData = unsign(signedCookie)
  if (!jsonData) return null

  try {
    const data = JSON.parse(jsonData)
    if (
      typeof data.authenticated !== 'boolean' ||
      typeof data.userId !== 'string' ||
      typeof data.username !== 'string' ||
      typeof data.isAdmin !== 'boolean'
    ) {
      return null
    }
    return data
  } catch {
    return null
  }
}
