import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/client'
import { verifyPassword } from '@/lib/auth/password'
import { signAuthCookie } from '@/lib/auth/cookie-sign'
import { checkRateLimit, recordFailedAttempt, clearRateLimitOnSuccess } from '@/lib/auth/rate-limit'

function getClientIP(): string {
  const headersList = headers()
  return headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         headersList.get('x-real-ip') ||
         'unknown'
}

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP()

    let username, password
    try {
      ({ username, password } = await request.json())
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check rate limit before processing
    const rateLimitCheck = checkRateLimit(clientIP, username)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.reason, retryAfter: rateLimitCheck.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
      )
    }

    const supabase = createServerClient()

    // Get user from database (include session_version for cookie)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, is_admin, is_active, session_version')
      .eq('username', username)
      .single()

    if (error || !user) {
      recordFailedAttempt(clientIP, username)
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      recordFailedAttempt(clientIP, username)
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact an administrator.' },
        { status: 401 }
      )
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      recordFailedAttempt(clientIP, username)
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Clear rate limits on successful login
    clearRateLimitOnSuccess(clientIP, username)

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Log the login activity
    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      action: 'login',
      details: { username: user.username }
    })

    // Set cookie with user info (JSON encoded)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin
      }
    })

    // Sign the cookie to prevent tampering
    // Include sessionVersion for server-side invalidation
    // Include issuedAt for absolute timeout
    const signedCookie = signAuthCookie({
      authenticated: true,
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin,
      sessionVersion: user.session_version || 1,
      issuedAt: Date.now()
    })

    // Session duration: 24 hours (reduced from 7 days for security)
    const SESSION_DURATION_SECONDS = 60 * 60 * 24  // 24 hours

    response.cookies.set('football_auth', signedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
