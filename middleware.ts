import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface AuthData {
  authenticated: boolean
  userId: string
  username: string
  isAdmin: boolean
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Works in Edge Runtime where crypto.timingSafeEqual is not available
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Do constant-time work proportional to input length to prevent timing leaks
    // Compare against 0 to ensure XOR produces meaningful work
    let mismatch = 1 // Start with mismatch since lengths differ
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ 0
    }
    return false
  }

  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

// Web Crypto API based HMAC for Edge Runtime
async function createHmacSignature(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(value)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

  // Convert to base64url
  const bytes = new Uint8Array(signature)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Inline unsign function (can't import from lib in middleware edge runtime)
async function unsignCookie(signedValue: string): Promise<string | null> {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    console.error('[Middleware] COOKIE_SECRET environment variable is required')
    return null
  }

  const lastDotIndex = signedValue.lastIndexOf('.')
  if (lastDotIndex === -1) return null

  const value = signedValue.slice(0, lastDotIndex)
  const signature = signedValue.slice(lastDotIndex + 1)

  const expectedSignature = await createHmacSignature(value, secret)

  // Timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(signature, expectedSignature)) return null

  return value
}

async function parseAuthCookie(cookieValue: string | undefined): Promise<AuthData | null> {
  if (!cookieValue) return null

  // Only accept signed cookies - no legacy fallback for security
  const unsignedValue = await unsignCookie(cookieValue)
  if (!unsignedValue) return null

  try {
    const data = JSON.parse(unsignedValue)
    if (data.authenticated === true) {
      return data as AuthData
    }
    return null
  } catch {
    return null
  }
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Enable HSTS (HTTP Strict Transport Security)
  // max-age=1 year, includeSubDomains
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // XSS Protection (legacy but still useful for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Content Security Policy
  // Allow: self, inline styles (for Tailwind), images from API-Football, fonts
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'", // Tailwind uses inline styles
      "img-src 'self' data: https://media.api-sports.io https://*.supabase.co blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

  // Permissions Policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to public routes (still add security headers)
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/leagues') ||
    pathname.startsWith('/api/fixtures') ||  // Live fixtures need to sync without auth
    pathname === '/api/match-analysis/auto-trigger'  // Called by Vercel cron
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Allow API key authenticated requests (for n8n and external automation)
  const apiKey = request.headers.get('x-api-key')
  const adminApiKey = process.env.ADMIN_API_KEY
  if (apiKey && adminApiKey && timingSafeEqual(apiKey, adminApiKey)) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Allow static files and Next.js internals (skip security headers for performance)
  // Use explicit extension matching instead of includes('.') to avoid matching API routes like /api/v1.0
  const staticExtensions = /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot|map|json|txt|xml|webmanifest)$/i
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    staticExtensions.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Parse auth cookie (async due to Web Crypto API)
  const authCookie = request.cookies.get('football_auth')?.value
  const authData = await parseAuthCookie(authCookie)

  // Admin routes require admin role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!authData || !authData.isAdmin) {
      // Redirect non-admins to home or login
      if (authData) {
        // Authenticated but not admin - redirect to home
        return addSecurityHeaders(NextResponse.redirect(new URL('/', request.url)))
      }
      // Not authenticated - redirect to login
      return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }
    return addSecurityHeaders(NextResponse.next())
  }

  // All other protected routes require authentication
  if (!authData) {
    const loginUrl = new URL('/login', request.url)
    return addSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  return addSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
