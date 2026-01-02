import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { generateResetToken } from '@/lib/auth/reset-token'
import { isAdmin } from '@/lib/auth'

/**
 * POST /api/auth/reset-password/request
 *
 * Request a password reset token for a user.
 * Only admins can request reset tokens (no email system for self-service).
 *
 * Body: { username: string }
 * Returns: { token: string, expiresAt: string } (token shown once, give to user)
 */
export async function POST(request: Request) {
  try {
    // Only admins can generate reset tokens
    if (!isAdmin()) {
      return NextResponse.json(
        { error: 'Admin access required to generate reset tokens' },
        { status: 403 }
      )
    }

    let username: string
    try {
      ({ username } = await request.json())
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, is_active')
      .eq('username', username)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not
      return NextResponse.json(
        { error: 'If the user exists, a reset token has been generated' },
        { status: 200 }
      )
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Cannot reset password for deactivated account' },
        { status: 400 }
      )
    }

    // Generate token
    const { token, tokenHash, expiresAt } = await generateResetToken()

    // Get admin user ID for audit
    const adminCookie = request.headers.get('cookie')
    let adminUserId: string | null = null
    if (adminCookie) {
      // Parse admin from cookie (simplified - in production use proper parsing)
      const { verifyAuthCookie } = await import('@/lib/auth/cookie-sign')
      const match = adminCookie.match(/football_auth=([^;]+)/)
      if (match) {
        const authData = verifyAuthCookie(match[1])
        adminUserId = authData?.userId || null
      }
    }

    // Store token hash in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by: adminUserId
      })

    if (insertError) {
      console.error('Failed to store reset token:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate reset token' },
        { status: 500 }
      )
    }

    // Log the activity
    await supabase.from('user_activity_log').insert({
      user_id: adminUserId,
      action: 'password_reset_generated',
      details: {
        target_user: user.username,
        target_user_id: user.id,
        expires_at: expiresAt.toISOString()
      }
    })

    // Return token (shown once - admin gives this to user)
    return NextResponse.json({
      success: true,
      message: 'Reset token generated. Give this token to the user (shown once).',
      token,
      expiresAt: expiresAt.toISOString(),
      username: user.username
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
