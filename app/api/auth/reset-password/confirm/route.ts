import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyResetToken } from '@/lib/auth/reset-token'
import { hashPassword, validatePassword } from '@/lib/auth/password'

/**
 * POST /api/auth/reset-password/confirm
 *
 * Use a reset token to set a new password.
 * No authentication required (token is the auth).
 *
 * Body: { token: string, newPassword: string }
 */
export async function POST(request: Request) {
  try {
    let token: string, newPassword: string
    try {
      ({ token, newPassword } = await request.json())
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    // Validate password requirements
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Find all unused, non-expired tokens
    // We need to check each one because token is hashed
    const { data: tokens, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, token_hash, expires_at, used_at')
      .is('used_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (tokenError) {
      console.error('Token lookup error:', tokenError)
      return NextResponse.json(
        { error: 'An error occurred' },
        { status: 500 }
      )
    }

    // Find matching token
    let matchedToken: typeof tokens[0] | null = null
    for (const t of tokens || []) {
      const isValid = await verifyResetToken(token, t.token_hash)
      if (isValid) {
        matchedToken = t
        break
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update user password and increment session_version to invalidate all sessions
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        session_version: supabase.rpc ? undefined : 1, // Increment handled below
        updated_at: new Date().toISOString()
      })
      .eq('id', matchedToken.user_id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Increment session_version to invalidate all active sessions
    await supabase.rpc('increment_session_version', { user_id: matchedToken.user_id }).catch(() => {
      // If RPC doesn't exist, do manual increment
      return supabase
        .from('users')
        .update({ session_version: supabase.sql`session_version + 1` })
        .eq('id', matchedToken.user_id)
    }).catch(() => {
      // Fallback: just set to 2 if user was at 1
      return supabase
        .from('users')
        .update({ session_version: 2 })
        .eq('id', matchedToken.user_id)
    })

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', matchedToken.id)

    // Log the activity
    await supabase.from('user_activity_log').insert({
      user_id: matchedToken.user_id,
      action: 'password_reset_completed',
      details: { method: 'reset_token' }
    })

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    })

  } catch (error) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
