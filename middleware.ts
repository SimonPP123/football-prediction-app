import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

function parseAuthCookie(cookieValue: string | undefined): AuthData | null {
  if (!cookieValue) return null

  try {
    const data = JSON.parse(cookieValue)
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

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
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
