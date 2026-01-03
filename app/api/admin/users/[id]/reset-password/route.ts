import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/client'
import { isAdminWithSessionValidation } from '@/lib/auth'
import { generateResetToken } from '@/lib/auth/reset-token'
import { isValidUUID } from '@/lib/validation'
import { verifyAuthCookie } from '@/lib/auth/cookie-sign'

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Admin endpoint to generate a password reset token for a specific user.
 * Returns a one-time token that the admin should give to the user.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    if (!(await isAdminWithSessionValidation())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = params.id

    // Validate UUID format
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get target user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, is_active')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Cannot reset password for deactivated account' },
        { status: 400 }
      )
    }

    // Get admin user ID from cookie
    const cookieStore = cookies()
    const authCookie = cookieStore.get('football_auth')?.value
    let adminUserId: string | null = null
    if (authCookie) {
      const authData = verifyAuthCookie(authCookie)
      adminUserId = authData?.userId || null
    }

    // Generate reset token
    const { token, tokenHash, expiresAt } = await generateResetToken()

    // Store token hash
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
      action: 'admin_password_reset',
      details: {
        target_user: user.username,
        target_user_id: user.id,
        expires_at: expiresAt.toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset token generated. Give this to the user (shown once only).',
      token,
      expiresAt: expiresAt.toISOString(),
      username: user.username,
      instructions: 'User should POST to /api/auth/reset-password/confirm with { token, newPassword }'
    })

  } catch (error) {
    console.error('Admin password reset error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
