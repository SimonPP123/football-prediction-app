import { cookies, headers } from 'next/headers'
import { verifyAuthCookie } from '@/lib/auth/cookie-sign'
import { createClient } from '@supabase/supabase-js'

/**
 * Shared authentication utility for API routes
 *
 * Supports two authentication methods:
 * 1. Cookie-based (for web app): Uses 'football_auth' cookie (signed)
 * 2. API Key-based (for n8n/external): Uses 'X-API-Key' header
 *
 * The API key should be set in .env.local as ADMIN_API_KEY
 */

// Create Supabase client for session validation
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Compares strings in constant time regardless of where they differ
 */
function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length)
  // Start with mismatch=1 if lengths differ
  let mismatch = a.length === b.length ? 0 : 1

  // Always iterate over the full length to prevent timing leaks
  for (let i = 0; i < maxLen; i++) {
    // Use 0 as fallback for out-of-bounds access
    const charA = i < a.length ? a.charCodeAt(i) : 0
    const charB = i < b.length ? b.charCodeAt(i) : 0
    mismatch |= charA ^ charB
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

/**
 * Get full auth data including sessionVersion
 */
export function getAuthData(): {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
  sessionVersion?: number
  issuedAt?: number
} | null {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  if (!authCookie) return null
  return verifyAuthCookie(authCookie)
}

/**
 * Validate session version against database
 * Returns true if session is valid, false if invalidated (e.g., password reset)
 *
 * IMPORTANT: Call this for security-critical operations like:
 * - Admin actions
 * - Password changes
 * - Sensitive data access
 */
export async function validateSessionVersion(): Promise<boolean> {
  const authData = getAuthData()
  if (!authData) return false

  // API key bypasses session version check
  const headersList = headers()
  const apiKey = headersList.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY
  if (apiKey && adminApiKey && timingSafeEqual(apiKey, adminApiKey)) {
    return true
  }

  // No session version in cookie = old cookie format, allow but log
  if (authData.sessionVersion === undefined) {
    console.warn(`[Auth] Session without version for user ${authData.userId}`)
    return true // Allow legacy sessions for now
  }

  // Validate session version against database
  const supabase = getSupabaseClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('session_version, is_active')
    .eq('id', authData.userId)
    .single()

  if (error || !user) {
    console.error(`[Auth] Session validation failed for user ${authData.userId}:`, error?.message)
    return false
  }

  // User deactivated = session invalid
  if (!user.is_active) {
    return false
  }

  // Session version mismatch = session invalidated (password reset, force logout)
  if (user.session_version !== authData.sessionVersion) {
    console.log(`[Auth] Session invalidated for user ${authData.userId}: cookie version ${authData.sessionVersion}, db version ${user.session_version}`)
    return false
  }

  return true
}

/**
 * Async version of isAdmin that validates session version
 * Use this for security-critical admin operations
 */
export async function isAdminWithSessionValidation(): Promise<boolean> {
  // Check API key first (bypasses session validation)
  const headersList = headers()
  const apiKey = headersList.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY
  if (apiKey && adminApiKey && timingSafeEqual(apiKey, adminApiKey)) {
    return true
  }

  // Check cookie auth and validate session
  const authData = getAuthData()
  if (!authData?.isAdmin) return false

  // Validate session is not invalidated
  return await validateSessionVersion()
}

/**
 * Async version of isAuthenticated that validates session version
 * Use this for security-critical operations
 */
export async function isAuthenticatedWithSessionValidation(): Promise<boolean> {
  // API key grants full access
  const headersList = headers()
  const apiKey = headersList.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY
  if (apiKey && adminApiKey && timingSafeEqual(apiKey, adminApiKey)) {
    return true
  }

  // Check cookie auth
  const authData = getAuthData()
  if (!authData?.authenticated && !authData?.isAdmin) return false

  // Validate session is not invalidated
  return await validateSessionVersion()
}
