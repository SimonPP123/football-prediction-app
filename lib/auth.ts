import { cookies, headers } from 'next/headers'
import { verifyAuthCookie } from '@/lib/auth/cookie-sign'

/**
 * Shared authentication utility for API routes
 *
 * Supports two authentication methods:
 * 1. Cookie-based (for web app): Uses 'football_auth' cookie (signed)
 * 2. API Key-based (for n8n/external): Uses 'X-API-Key' header
 *
 * The API key should be set in .env.local as ADMIN_API_KEY
 */

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to maintain constant time even when lengths differ
    let mismatch = 0
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ a.charCodeAt(i)
    }
    return false
  }

  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Parse and verify the auth cookie (signed format only - no legacy fallback)
 */
function parseAuthCookie(cookieValue: string | undefined): {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
} | null {
  if (!cookieValue) return null

  // Only accept signed cookies - no legacy fallback for security
  return verifyAuthCookie(cookieValue)
}

/**
 * Check if the request is from an admin user
 * Works with both cookie auth (web app) and API key auth (n8n)
 */
export function isAdmin(): boolean {
  // Check API key first (for n8n and external automation)
  const headersList = headers()
  const apiKey = headersList.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY

  if (apiKey && adminApiKey && timingSafeEqual(apiKey, adminApiKey)) {
    return true
  }

  // Fall back to cookie auth (for web app)
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  const authData = parseAuthCookie(authCookie)

  return authData?.isAdmin === true
}

/**
 * Check if the request is from any authenticated user
 */
export function isAuthenticated(): boolean {
  // API key grants full access
  const headersList = headers()
  const apiKey = headersList.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY

  if (apiKey && adminApiKey && timingSafeEqual(apiKey, adminApiKey)) {
    return true
  }

  // Check cookie auth
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  const authData = parseAuthCookie(authCookie)

  return authData?.authenticated === true || authData?.isAdmin === true
}

/**
 * Get the authenticated user's ID from the cookie
 */
export function getAuthUserId(): string | null {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  const authData = parseAuthCookie(authCookie)
  return authData?.userId || null
}
