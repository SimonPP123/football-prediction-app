import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

// Inline unsign function (can't import from lib in middleware edge runtime)
function unsignCookie(signedValue: string): string | null {
  const secret = process.env.COOKIE_SECRET || 'default-secret-change-in-production'
  const lastDotIndex = signedValue.lastIndexOf('.')
  if (lastDotIndex === -1) return null

  const value = signedValue.slice(0, lastDotIndex)
  const signature = signedValue.slice(lastDotIndex + 1)

  const expectedSignature = createHmac('sha256', secret)
    .update(value)
    .digest('base64url')

  // Simple comparison (timing-safe not critical in middleware)
  if (signature !== expectedSignature) return null

  return value
}

function parseAuthCookie(cookieValue: string | undefined): AuthData | null {
  if (!cookieValue) return null

  // Try to unsign the cookie first (new signed format)
  const unsignedValue = unsignCookie(cookieValue)
  const jsonValue = unsignedValue || cookieValue // Fall back to raw value for legacy

  try {
    const data = JSON.parse(jsonValue)
    if (data.authenticated === true) {
      return data as AuthData
    }
    return null
  } catch {
    // Handle legacy cookie format (just 'authenticated' string)
    if (cookieValue === 'authenticated') {
      return null // Force re-login for old cookie format
    }
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to public routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/leagues') ||
    pathname === '/api/match-analysis/auto-trigger'  // Called by Vercel cron
  ) {
    return NextResponse.next()
  }

  // Allow API key authenticated requests (for n8n and external automation)
  const apiKey = request.headers.get('x-api-key')
  if (apiKey && process.env.ADMIN_API_KEY && apiKey === process.env.ADMIN_API_KEY) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  // Use explicit extension matching instead of includes('.') to avoid matching API routes like /api/v1.0
  const staticExtensions = /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot|map|json|txt|xml|webmanifest)$/i
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    staticExtensions.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Parse auth cookie
  const authCookie = request.cookies.get('football_auth')?.value
  const authData = parseAuthCookie(authCookie)

  // Admin routes require admin role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!authData || !authData.isAdmin) {
      // Redirect non-admins to home or login
      if (authData) {
        // Authenticated but not admin - redirect to home
        return NextResponse.redirect(new URL('/', request.url))
      }
      // Not authenticated - redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // All other protected routes require authentication
  if (!authData) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
