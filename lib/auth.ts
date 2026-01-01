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
 * Parse the auth cookie (handles both signed and unsigned formats)
 */
function parseAuthCookie(cookieValue: string | undefined): {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
} | null {
  if (!cookieValue) return null

  // Try signed cookie format first
  const verified = verifyAuthCookie(cookieValue)
  if (verified) return verified

  // Fall back to legacy unsigned format
  try {
    const data = JSON.parse(cookieValue)
    if (data.authenticated === true) {
      return data
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check if the request is from an admin user
 * Works with both cookie auth (web app) and API key auth (n8n)
 */
export function isAdmin(): boolean {
  // Check API key first (for n8n and external automation)
  const headersList = headers()
  const apiKey = headersList.get('x-api-key')

  if (apiKey && process.env.ADMIN_API_KEY) {
    if (apiKey === process.env.ADMIN_API_KEY) {
      return true
    }
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

  if (apiKey && process.env.ADMIN_API_KEY) {
    if (apiKey === process.env.ADMIN_API_KEY) {
      return true
    }
  }

  // Check cookie auth
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  const authData = parseAuthCookie(authCookie)

  return authData?.authenticated === true || authData?.isAdmin === true
}
