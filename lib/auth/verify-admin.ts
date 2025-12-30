import { cookies } from 'next/headers'
import { verifyAuthCookie } from './cookie-sign'

export interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

/**
 * Parses and verifies the auth cookie
 * Supports both signed and unsigned cookies for backward compatibility
 */
export function getAuthData(): AuthData | null {
  const cookieStore = cookies()
  const authCookie = cookieStore.get('football_auth')?.value
  if (!authCookie) return null

  // Try to verify as signed cookie first
  const signedData = verifyAuthCookie(authCookie)
  if (signedData) {
    return signedData
  }

  // Fall back to unsigned JSON for backward compatibility
  // This allows existing sessions to keep working
  try {
    const data = JSON.parse(authCookie)
    if (data.authenticated === true) {
      return {
        authenticated: data.authenticated,
        userId: data.userId,
        username: data.username,
        isAdmin: data.isAdmin === true
      }
    }
    return null
  } catch {
    return null
  }
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
