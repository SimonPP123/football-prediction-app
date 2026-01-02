import { cookies } from 'next/headers'
import { verifyAuthCookie } from './cookie-sign'

export interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

/**
 * Parses and verifies the auth cookie (signed format only - no legacy fallback)
 */
export function getAuthData(): AuthData | null {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  if (!authCookie) return null

  // Only accept signed cookies - no legacy fallback for security
  return verifyAuthCookie(authCookie)
}

/**
 * Checks if the current request is from an authenticated admin
 */
export function isAdmin(): boolean {
  const authData = getAuthData()
  return authData?.isAdmin === true
}

/**
 * Gets the current user ID from the auth cookie
 */
export function getUserId(): string | null {
  const authData = getAuthData()
  return authData?.userId || null
}
