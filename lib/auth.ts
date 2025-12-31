import { cookies, headers } from 'next/headers'

/**
 * Shared authentication utility for API routes
 *
 * Supports two authentication methods:
 * 1. Cookie-based (for web app): Uses 'football_auth' cookie
 * 2. API Key-based (for n8n/external): Uses 'X-API-Key' header
 *
 * The API key should be set in .env.local as ADMIN_API_KEY
 */

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

  if (!authCookie) return false

  try {
    const authData = JSON.parse(authCookie)
    return authData.isAdmin === true
  } catch {
    return false
  }
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

  if (!authCookie) return false

  try {
    const authData = JSON.parse(authCookie)
    return authData.isAuthenticated === true || authData.isAdmin === true
  } catch {
    return false
  }
}
